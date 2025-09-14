/* eslint-disable */

function details() {
  return {
    id: "Tdarr_Plugin_Keep_Native_Lang_Recox",
    Name: "Keep Native Language - RecoX",
    Type: "Video",
    Operation: "Remux",
    Description: `This plugin keeps only the native language audio and subtitle tracks while removing other language tracks. 
    It preserves the video stream and any native language tracks (configurable, defaults to English 'eng'). 
    Non-native language tracks are removed to save space while maintaining the user's preferred language experience.
    
    Features:
    - Preserves native language audio tracks
    - Preserves native language subtitle tracks  
    - Removes other language tracks
    - Maintains video quality (copy codec)
    - Configurable native language (defaults to 'eng')
    - Handles multiple native language tracks
    - Fallback to first audio track if no native language found`,
    Version: "1.00",
    Tags: "pre-processing,audio,subtitle,language,cleanup",
    Inputs: [
      {
        name: 'nativeLanguage',
        type: 'string',
        defaultValue: 'eng',
        inputUI: {
          type: 'text',
        },
        tooltip: `Enter your native language code (e.g., 'eng' for English, 'spa' for Spanish, 'fre' for French, 'ger' for German, 'jpn' for Japanese, etc.)`,
      },
    ],
  };
}

function plugin(file, librarySettings, inputs, otherArguments) {
  // Load default values for inputs
  inputs = inputs || {};
  const nativeLanguage = inputs.nativeLanguage || 'eng';

  // Must return this object
  var response = {
    processFile: false,
    preset: '',
    container: file.container,
    handBrakeMode: false,
    FFmpegMode: false,
    reQueueAfter: false,
    infoLog: '',
  };

  // Check if file is video
  if (file.fileMedium !== "video") {
    response.infoLog += "☒ File is not video \n";
    response.processFile = false;
    return response;
  }

  response.FFmpegMode = true;
  
  // Get native language from inputs
  response.infoLog += `☑ Native language set to: ${nativeLanguage} \n`;

  // Analyze streams
  let videoStreamFound = false;
  let nativeAudioTracks = [];
  let nativeSubtitleTracks = [];
  let allAudioTracks = [];
  let allSubtitleTracks = [];
  let hasOtherLanguages = false;

  for (let i = 0; i < file.ffProbeData.streams.length; i++) {
    const stream = file.ffProbeData.streams[i];
    
    try {
      if (stream.codec_type.toLowerCase() === "video") {
        videoStreamFound = true;
      } else if (stream.codec_type.toLowerCase() === "audio") {
        allAudioTracks.push(i);
        
        // Check language tag
        const streamLang = stream.tags && stream.tags.language ? stream.tags.language.toLowerCase() : '';
        if (streamLang.includes(nativeLanguage.toLowerCase()) || streamLang === nativeLanguage.toLowerCase()) {
          nativeAudioTracks.push(i);
          response.infoLog += `☑ Found native audio track (${i}): ${streamLang} \n`;
        } else if (streamLang && streamLang !== '') {
          hasOtherLanguages = true;
          response.infoLog += `☒ Found non-native audio track (${i}): ${streamLang} \n`;
        } else {
          // Track with no language tag - assume it might be native for fallback
          response.infoLog += `☐ Found audio track with no language tag (${i}) \n`;
        }
      } else if (stream.codec_type.toLowerCase() === "subtitle") {
        allSubtitleTracks.push(i);
        
        // Check language tag
        const streamLang = stream.tags && stream.tags.language ? stream.tags.language.toLowerCase() : '';
        if (streamLang.includes(nativeLanguage.toLowerCase()) || streamLang === nativeLanguage.toLowerCase()) {
          nativeSubtitleTracks.push(i);
          response.infoLog += `☑ Found native subtitle track (${i}): ${streamLang} \n`;
        } else if (streamLang && streamLang !== '') {
          hasOtherLanguages = true;
          response.infoLog += `☒ Found non-native subtitle track (${i}): ${streamLang} \n`;
        } else {
          // Track with no language tag - might be native
          response.infoLog += `☐ Found subtitle track with no language tag (${i}) \n`;
        }
      }
    } catch (err) {
      response.infoLog += `⚠ Error processing stream ${i}: ${err.message} \n`;
    }
  }

  if (!videoStreamFound) {
    response.infoLog += "☒ No video stream found in file \n";
    response.processFile = false;
    return response;
  }

  // If no native audio tracks found, use first audio track as fallback
  if (nativeAudioTracks.length === 0 && allAudioTracks.length > 0) {
    response.infoLog += `☒ No native language (${nativeLanguage}) audio tracks found, using first audio track as fallback \n`;
    nativeAudioTracks.push(allAudioTracks[0]);
  }

  // Check if we need to process the file
  const totalAudioTracks = allAudioTracks.length;
  const totalSubtitleTracks = allSubtitleTracks.length;
  const nativeAudioCount = nativeAudioTracks.length;
  const nativeSubtitleCount = nativeSubtitleTracks.length;

  response.infoLog += `☑ Stream analysis: ${totalAudioTracks} audio tracks (${nativeAudioCount} native), ${totalSubtitleTracks} subtitle tracks (${nativeSubtitleCount} native) \n`;

  // If no other languages found, no need to process
  if (!hasOtherLanguages) {
    response.infoLog += "☑ No non-native language tracks detected, file already clean \n";
    response.processFile = false;
    return response;
  }

  // If all tracks are already native language only, no need to process
  if (nativeAudioCount === totalAudioTracks && nativeSubtitleCount === totalSubtitleTracks) {
    response.infoLog += "☑ All tracks are already in native language, no processing needed \n";
    response.processFile = false;
    return response;
  }

  // Build FFmpeg mapping arguments
  let mapArgs = [];
  
  // Map all video streams
  mapArgs.push('-map 0:v');
  
  // Map native audio tracks
  for (let trackIndex of nativeAudioTracks) {
    mapArgs.push(`-map 0:${trackIndex}`);
  }
  
  // Map native subtitle tracks (optional mapping with ?)
  for (let trackIndex of nativeSubtitleTracks) {
    mapArgs.push(`-map 0:${trackIndex}?`);
  }
  
  // Copy all codecs (no transcoding)
  mapArgs.push('-c copy');

  const preset = mapArgs.join(' ');

  response.processFile = true;
  response.preset = `, ${preset}`;
  response.container = `.${file.container}`;
  response.handBrakeMode = false;
  response.FFmpegMode = true;
  response.reQueueAfter = true;
  response.infoLog += `☒ File needs processing to keep only native language (${nativeLanguage}) tracks \n`;
  response.infoLog += `☑ Will keep ${nativeAudioCount} audio track(s) and ${nativeSubtitleCount} subtitle track(s) \n`;

  return response;
}

module.exports.details = details;
module.exports.plugin = plugin;