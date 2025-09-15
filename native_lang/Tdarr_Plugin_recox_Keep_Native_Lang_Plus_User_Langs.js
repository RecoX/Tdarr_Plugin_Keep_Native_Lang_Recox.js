/* eslint-disable no-await-in-loop */
module.exports.dependencies = ['axios@0.27.2', '@cospired/i18n-iso-languages'];

const details = () => ({
  id: 'Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs',
  Stage: 'Pre-processing',
  Name: 'Keep Native Language + User Languages with Fallback',
  Type: 'Audio',
  Operation: 'Transcode',
  Description: `Enhanced audio language management plugin by RecoX, based on gsariev's modifications of henk's original work.
  
  FEATURES:
  • Intelligently removes unwanted audio tracks while preserving native and user-specified languages
  • Uses TMDB API to identify original/native language from movie/TV metadata
  • Integrates with Radarr/Sonarr for robust media identification
  • Fallback system prevents silent movies when metadata lookup fails
  • Commentary track management (remove/keep based on preference)
  • Supports multiple language codes and mapping between services
  
  FALLBACK BEHAVIOR:
  When TMDB/Radarr/Sonarr lookup fails:
  1. Attempts to keep English audio tracks only
  2. If no English found, keeps first audio track as safety measure
  3. Ensures no media files are completely skipped due to missing metadata
  
  REQUIREMENTS:
  • TMDB API key (v3)
  • Radarr and/or Sonarr with API access
  • Media files with IMDb/TMDB/TVDB IDs in filename (recommended)`,
  Version: '2.0',
  Tags: 'pre-processing,configurable,audio,language,fallback',
  Inputs: [
    {
      name: 'user_langs',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip:
        'Comma-separated list of ISO-639-2 language codes to keep alongside the native language.'
        + ' Leave empty to keep only the native language detected from TMDB.'
        + ' (Reference: https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes)'
        + '\\nExample: ger,fre,spa,ita'
        + '\\nNote: In fallback mode (no metadata), English will be kept regardless of this setting.',
    },
    {
      name: 'priority',
      type: 'string',
      defaultValue: 'radarr',
      inputUI: {
        type: 'text',
      },
      tooltip:
        'Service priority for media identification. Determines which service to query first for metadata.'
        + '\\nOptions: "radarr" (movies first) or "sonarr" (TV shows first)'
        + '\\nDefault: radarr'
        + '\\nRecommendation: Use "radarr" for movie libraries, "sonarr" for TV libraries.',
    },
    {
      name: 'api_key',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip:
        'Your TMDB API (v3) key - REQUIRED for native language detection.'
        + '\\nGet your free API key at: https://www.themoviedb.org/'
        + '\\nWithout this key, plugin will fall back to English-only mode.',
    },
    {
      name: 'radarr_api_key',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Input your Radarr api key here.',
    },
    {
      name: 'radarr_url',
      type: 'string',
      defaultValue: '192.168.1.2:7878',
      inputUI: {
        type: 'text',
      },
      tooltip:
        'Input your Radarr url here. (Without http://). Do include the port.'
        + '\\nExample:\\n'
        + '192.168.1.2:7878',
    },
    {
      name: 'sonarr_api_key',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Input your Sonarr api key here.',
    },
    {
      name: 'sonarr_url',
      type: 'string',
      defaultValue: '192.168.1.2:8989',
      inputUI: {
        type: 'text',
      },
      tooltip:
        'Input your Sonarr url here. (Without http://). Do include the port.'
        + '\\nExample:\\n'
        + '192.168.1.2:8989',
    },
    {
      name: 'commentary',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: [
          'false',
          'true',
        ],
      },
      tooltip: `Commentary and description track handling.
               \\nOptions:
               \\n• false (default): Keep commentary tracks
               \\n• true: Remove tracks with titles containing "commentary", "description", or "sdh"
               \\n
               \\nRecommended: true (removes commentary tracks for cleaner audio selection)`,
    },
  ],
});

// Plugin response object - contains all output data for Tdarr
const response = {
  processFile: false,        // Whether Tdarr should process the file
  preset: ', -map 0 ',       // FFmpeg command preset
  container: '.',            // Output container format
  handBrakeMode: false,      // Use HandBrake instead of FFmpeg
  FFmpegMode: true,          // Use FFmpeg for processing
  reQueueAfter: false,       // Re-queue file after processing
  infoLog: '',              // Detailed log information shown to user
};

/**
 * Converts TMDB 2-letter language codes to ISO-639-2 3-letter format
 * @param {string} tmdbLanguageCode - 2-letter language code from TMDB (e.g., 'en', 'fr')
 * @returns {string|null} - 3-letter ISO-639-2 code (e.g., 'eng', 'fre') or null if conversion fails
 */

const languageConverter = (tmdbLanguageCode) => {
  const isoLang = require('@cospired/i18n-iso-languages');

  try {
    // Convert TMDB language code to ISO-639-2 3-letter format
    const convertedLanguageCode = isoLang.alpha2ToAlpha3B(tmdbLanguageCode);

    // Log the converted language code
    response.infoLog += `TMDB Language Code Return: ${convertedLanguageCode}\n`;

    return convertedLanguageCode;
  } catch (error) {
    console.error('Error converting language code:', error.message);
    response.infoLog += '☒Error converting language code.\n';
    return null;
  }
};

/**
 * Parses API response from Radarr or Sonarr
 * @param {Object} body - API response body
 * @param {string} filePath - File path for context
 * @param {string} arr - Service type ('radarr' or 'sonarr')
 * @returns {Object} - Parsed movie or series object
 */
const parseArrResponse = (body, filePath, arr) => {
  // eslint-disable-next-line default-case
  switch (arr) {
    case 'radarr':
      return body.movie;
    case 'sonarr':
      return body.series;
  }
};

/**
 * Main stream processing function - analyzes audio tracks and determines which to keep/remove
 * @param {Object} result - TMDB result containing original_language
 * @param {Object} file - Tdarr file object with ffProbeData
 * @param {Array} userLangs - User-specified language codes to keep
 * @param {boolean} isSonarr - Whether this is processing a Sonarr result
 * @param {boolean} includeCommentary - Whether to remove commentary tracks
 * @returns {Object} - Object containing keep/remove track arrays and removed language names
 */
const processStreams = (result, file, userLangs, isSonarr, includeCommentary) => {
  const languages = require('@cospired/i18n-iso-languages');
  const tracks = {
    keep: [],
    remove: [],
    remLangs: '',
  };
  let streamIndex = 0;

  // Convert the TMDB language code to ISO-639-2 3-letter format dynamically
  const tmdbLanguageCode = result.original_language;
  const convertedLanguageCode = languageConverter(tmdbLanguageCode) || tmdbLanguageCode;

  response.infoLog += `Original language tag: ${convertedLanguageCode}\n`;

  // Initialize tracking: assume we'll keep the native language track
  // Note: This is optimistic - we'll verify actual matches during stream analysis
  tracks.keep.push(streamIndex);
  response.infoLog += `Keeping the original language audio track: ${languages.getName(result.original_language, 'en')}\n`;

  // Flag to track if we actually find matching audio streams
  let matchFound = false;

  for (const stream of file.ffProbeData.streams) {
    if (stream.codec_type === 'audio') {
      if (!stream.tags) {
        response.infoLog += `☒No tags found on audio track ${streamIndex}. Removing it.\n`;
        tracks.remove.push(streamIndex);
        response.preset += `-map -0:a:${streamIndex} `;
      } else if (stream.tags.title && isCommentaryTrack(stream.tags.title)) {
        // Remove commentary tracks if includeCommentary is true
        if (includeCommentary) {
          response.infoLog += `☒Removing commentary audio track: ${languages.getName(stream.tags.language, 'en')} (commentary) - ${stream.tags.title}\n`;
          tracks.remove.push(streamIndex);
          response.preset += `-map -0:a:${streamIndex} `;
          tracks.remLangs += `${languages.getName(stream.tags.language, 'en')} (commentary), `;
        }
      } else if (stream.tags.language) {
        // Check if the language is in the user-defined languages or it's the original language
        const mappedLanguage = isSonarr ? mapSonarrLanguageToTMDB(stream.tags.language) : mapRadarrLanguageToTMDB(stream.tags.language);
        
        if (userLangs.includes(mappedLanguage) || mappedLanguage === convertedLanguageCode) {
          tracks.keep.push(streamIndex);
          response.infoLog += `☑Keeping audio track with language: ${languages.getName(stream.tags.language, 'en')}\n`;
          matchFound = true; // At least one track matches the specified languages
        } else {
          response.infoLog += `☒Removing audio track with language: ${languages.getName(stream.tags.language, 'en')}\n`;
          tracks.remove.push(streamIndex);
          response.preset += `-map -0:a:${streamIndex} `;
          tracks.remLangs += `${languages.getName(stream.tags.language, 'en')}, `;
        }
      } else {
        response.infoLog += `☒No language tag found on audio track ${streamIndex}. Removing it.\n`;
        tracks.remove.push(streamIndex);
        response.preset += `-map -0:a:${streamIndex} `;
      }

      streamIndex += 1;
    }
  }

  // Return tracks object, don't modify global response.preset here to avoid duplication
  return tracks;
};

const mapRadarrLanguageToTMDB = (radarrLanguage) => {
  const languageMappings = {
    chi: 'cn',
    // Add additional mapping if needed
  };

  return languageMappings[radarrLanguage] || radarrLanguage;
};

const mapSonarrLanguageToTMDB = (sonarrLanguage) => {
  const languageMappings = {
    // Add mappings for Sonarr languages if needed
  };

  return languageMappings[sonarrLanguage] || sonarrLanguage;
};

/**
 * Queries TMDB API using IMDb ID to get movie/TV show metadata including original language
 * @param {string} filename - Filename or IMDb ID to search for
 * @param {string} api_key - TMDB API key
 * @param {Object} axios - Axios HTTP client instance
 * @returns {Object|null} - TMDB result object or null if not found
 */
const tmdbApi = async (filename, api_key, axios) => {
  let fileName;

  if (filename) {
    if (filename.slice(0, 2) === 'tt') {
      fileName = filename;
    } else {
      const idRegex = /(tt\d{7,8})/;
      const fileMatch = filename.match(idRegex);

      if (fileMatch) {
        fileName = fileMatch[1];
      }
    }
  }

  if (fileName) {
    try {
      const result = await axios
        .get(
          `https://api.themoviedb.org/3/find/${fileName}?api_key=`
          + `${api_key}&language=en-US&external_source=imdb_id`,
        )
        .then((resp) => (resp.data.movie_results.length > 0
          ? resp.data.movie_results[0]
          : resp.data.tv_results[0]));

      console.log('TMDB API Result:', result);

      if (!result) {
        response.infoLog += '☒No IMDb result was found. \n';
      }

      if (result) {
        const tmdbLanguageCode = languageConverter(result.original_language);

        response.infoLog += `Converted TMDB Language Code: ${tmdbLanguageCode}\n`;
        response.infoLog += `Language tag picked up by TMDB: ${tmdbLanguageCode}\n`;
      } else {
        response.infoLog += "☒Couldn't find the IMDb id of this file. Skipping. \n";
      }

      return result;
    } catch (error) {
      console.error('Error fetching data from TMDB API:', error.message);
      response.infoLog += '☒Error fetching data from TMDB API.\n';
      return null;
    }
  }

  return null;
};

/**
 * Identifies commentary tracks by analyzing track titles for specific keywords
 * @param {string} title - Audio track title to analyze
 * @returns {boolean} - True if track appears to be commentary/description
 */
const isCommentaryTrack = (title) => {
  // Check if the title includes keywords indicating a commentary track
  return title.toLowerCase().includes('commentary')
    || title.toLowerCase().includes('description')
    || title.toLowerCase().includes('sdh');
};

/**
 * Main plugin function - orchestrates the entire audio track processing workflow
 * @param {Object} file - Tdarr file object containing media information
 * @param {Object} librarySettings - Tdarr library configuration
 * @param {Object} inputs - User-provided plugin configuration
 * @param {Object} otherArguments - Additional Tdarr arguments
 * @returns {Object} - Plugin response object with processing results
 */

const plugin = async (file, librarySettings, inputs, otherArguments) => {
  const lib = require('../methods/lib')();
  const axios = require('axios').default;

  inputs = lib.loadDefaultValues(inputs, details);

  response.container = `.${file.container}`;
  let prio = ['radarr', 'sonarr'];
  let radarrResult = null;
  let sonarrResult = null;
  let tmdbResult = null;

  if (inputs.priority && inputs.priority === 'sonarr') {
    prio = ['sonarr', 'radarr'];
  }

  const fileNameEncoded = encodeURIComponent(file.meta.FileName);

  for (const arr of prio) {
    let imdbId;

    // Reset infoLog before each processing step (removes duplicated logs being displayed)
    response.infoLog = '';

    switch (arr) {
      case 'radarr':
        if (tmdbResult) break;
        if (inputs.radarr_api_key) {
          radarrResult = parseArrResponse(
            await axios
              .get(
                `http://${inputs.radarr_url}/api/v3/parse?apikey=${inputs.radarr_api_key}&title=${fileNameEncoded}`,
              )
              .then((resp) => resp.data),
            fileNameEncoded,
            'radarr',
          );

          if (radarrResult) {
            imdbId = radarrResult.imdbId;
            response.infoLog += `Grabbed ID (${imdbId}) from Radarr \n`;

            const radarrLanguageTag = radarrResult.originalLanguage.name;
            response.infoLog += `Language tag picked up by Radarr: ${radarrLanguageTag}\n`;

            tmdbResult = await tmdbApi(imdbId, inputs.api_key, axios);

            if (tmdbResult) {
              const tmdbLanguageTag = languageConverter(tmdbResult.original_language) || tmdbResult.original_language;
              response.infoLog += `Language tag picked up by TMDB: ${tmdbLanguageTag}\n`;
            }
          } else {
            response.infoLog += "Couldn't grab ID from Radarr \n";
            imdbId = fileNameEncoded;
            tmdbResult = await tmdbApi(imdbId, inputs.api_key, axios);

            if (tmdbResult) {
              const tmdbLanguageTag = languageConverter(tmdbResult.original_language) || tmdbResult.original_language;
              response.infoLog += `Language tag picked up by TMDB: ${tmdbLanguageTag}\n`;
            }
          }
        }
        break;
      case 'sonarr':
        if (tmdbResult) break;
        if (inputs.sonarr_api_key) {
          sonarrResult = parseArrResponse(
            await axios.get(
              `http://${inputs.sonarr_url}/api/v3/parse?apikey=${inputs.sonarr_api_key}&title=${fileNameEncoded}`,
            )
              .then((resp) => resp.data),
            file.meta.Directory,
            'sonarr',
          );

          if (sonarrResult) {
            imdbId = sonarrResult.imdbId;
            response.infoLog += `Grabbed ID (${imdbId}) from Sonarr \n`;

            tmdbResult = await tmdbApi(imdbId, inputs.api_key, axios);

            if (tmdbResult) {
              const sonarrTracks = processStreams(tmdbResult, file, inputs.user_langs ? inputs.user_langs.split(',') : '', true, inputs.commentary);

              if (sonarrTracks.remove.length > 0) {
                if (sonarrTracks.keep.length > 0) {
                  response.infoLog += `☑Removing tracks with languages: ${sonarrTracks.remLangs.slice(
                     0,
                     -2,
                  )}. \n`;
                  response.processFile = true;
                  // Build the final FFmpeg preset for Sonarr processing
                  response.preset += ' -c copy -max_muxing_queue_size 9999';
                  response.infoLog += '\n';
                  return response; // Exit early, we've processed everything needed
                } else {
                  response.infoLog
                    += '☒Cancelling plugin otherwise all audio tracks would be removed. \n';
                  return response; // Exit early
                }
              } else {
                response.infoLog += '☒No audio tracks to be removed. \n';
                return response; // Exit early
              }
            } else {
              response.infoLog += "☒Couldn't find the IMDb id of this file. Skipping. \n";
              return response; // Exit early
            }
          }
        }
        break;
    }
  }

  if (tmdbResult) {
    const userLanguages = inputs.user_langs ? inputs.user_langs.split(',') : [];
    const originalLanguage = tmdbResult.original_language;
    const originalLanguageIncluded = userLanguages.includes(originalLanguage);

    const tracks = processStreams(
      tmdbResult,
      file,
      userLanguages,
      false,
      inputs.commentary,
    );

    console.log('Tracks:', tracks);
    console.log('Original Language:', originalLanguage);
    console.log('User Languages:', userLanguages);
    console.log('Original Language Included:', originalLanguageIncluded);
    console.log('User Languages Include Removed Languages:', userLanguages.includes(tracks.remLangs));

    // Check if no tracks match original or user-specified languages
    const noMatchingTracks = tracks.keep.length === 0 && !originalLanguageIncluded && !userLanguages.includes(tracks.remLangs);

    console.log('No Matching Tracks:', noMatchingTracks);

    if (noMatchingTracks) {
      response.infoLog += '☒Cancelling plugin because no audio tracks match the original language or user-specified languages. \n';
      return response; // Stop execution
    }

    // Continue processing audio tracks
    if (tracks.remove.length > 0) {
      if (tracks.keep.length > 0) {
        response.infoLog += `☑Removing tracks with languages: ${tracks.remLangs.slice(
          0,
          -2,
        )}. \n`;
        response.processFile = true;
        response.infoLog += '\n';
      } else {
        response.infoLog += '☒Cancelling plugin otherwise all audio tracks would be removed. \n';
      }
    } else {
      response.infoLog += '☒No audio tracks to be removed. \n';
    }

    // Build the final FFmpeg preset only once, after all processing is determined
    if (response.processFile) {
      response.preset += ' -c copy -max_muxing_queue_size 9999';
    }
  } else {
    // Fallback: keep only English when no metadata is available
    response.infoLog += "☒No metadata found. Falling back to keeping English only.\n";
    
    const fallbackResult = { original_language: 'en' }; // Default to English as fallback
    const fallbackLanguages = ['eng']; // Only English in fallback mode
    
    response.infoLog += "Fallback language: English only\n";
    
    const tracks = processStreams(
      fallbackResult,
      file,
      fallbackLanguages,
      false,
      inputs.commentary,
    );

    console.log('Fallback Mode - Tracks:', tracks);
    console.log('Fallback Mode - Languages: English only');

    // Continue processing audio tracks in fallback mode
    if (tracks.remove.length > 0) {
      if (tracks.keep.length > 0) {
        response.infoLog += `☑Removing tracks with languages: ${tracks.remLangs.slice(
          0,
          -2,
        )}. \n`;
        response.processFile = true;
        response.infoLog += '\n';
      } else {
        response.infoLog += '☒Cancelling plugin otherwise all audio tracks would be removed. \n';
      }
    } else {
      // Check if we're in the "keep first track" scenario
      if (tracks.keep.length === 1 && tracks.keep[0] === 0) {
        response.infoLog += '☑Keeping first audio track as fallback. \n';
        response.processFile = false; // No processing needed, keeping original
      } else {
        response.infoLog += '☒No audio tracks to be removed in fallback mode. \n';
      }
    }

    // Build the final FFmpeg preset for fallback mode
    if (response.processFile) {
      response.preset += ' -c copy -max_muxing_queue_size 9999';
    }
  }

  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
