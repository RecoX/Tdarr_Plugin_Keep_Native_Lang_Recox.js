# Tdarr Plugin Collection by RecoX

A collection of modified Tdarr plugins for comprehensive media optimization with intelligent handling.

## Plugins in This Repository

### 1. Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs
A modified plugin for keeping native language and user-specified audio tracks with intelligent fallback handling.

### 2. Tdarr_Plugin_recox_MP4_Faststart  
A companion plugin for MP4 faststart web optimization with intelligent detection.

---

## History & Attribution

### Original Plugin
- **Original Plugin**: [Tdarr_Plugin_henk_Keep_Native_Lang_Plus_Eng](https://docs.tdarr.io/docs/plugins/classic-plugins/index/Tdarr_Plugin_henk_Keep_Native_Lang_Plus_Eng)
- **Original Author**: henk
- **Original Purpose**: Remove all language audio tracks except the 'native' and English

### First Modification by gsariev
- **Modified by**: [gsariev](https://gist.github.com/gssariev)
- **Source**: [GitHub Gist](https://gist.github.com/gssariev/6a89f81e2cc36c35f002e064261118cc)
- **Reddit Guide**: [Optimize Media For Direct Play](https://www.reddit.com/r/Tdarr/comments/1cba135/guideplex_optimize_media_for_direct_play_by/)
- **Key Improvements**:
  - Added support for user-specified language tracks (not just English)
  - Enhanced commentary track handling
  - Better integration with both Radarr and Sonarr
  - Improved language mapping and conversion

### Current Version by RecoX
- **Modified by**: RecoX
- **Repository**: [Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs](https://github.com/RecoX/Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs)
- **Key Enhancements**:
  - **Intelligent Fallback System**: When metadata lookup fails, the plugin now falls back to keeping English tracks only
  - **First Track Protection**: If no English tracks are found in fallback mode, keeps the first audio track to prevent silent movies
  - **Better Error Handling**: No longer skips files entirely when TMDB/Radarr/Sonarr lookups fail
  - **Enhanced Logging**: More detailed information about fallback decisions

---

## Features

### Core Functionality
- **Native Language Detection**: Uses TMDB API to identify the original/native language of movies and TV shows
- **Multi-Service Integration**: Works with Radarr, Sonarr, and TMDB APIs
- **User-Specified Languages**: Keep additional languages beyond the native one
- **Commentary Track Handling**: Option to remove or keep commentary/description tracks
- **Language Mapping**: Handles language code conversions between different services

### Fallback System (New in RecoX Version)
When metadata lookup fails (no TMDB/Radarr/Sonarr data available):
1. **Primary Fallback**: Attempts to keep English audio tracks only
2. **Secondary Fallback**: If no English tracks exist, keeps the first audio track
3. **File Protection**: Ensures no files are completely skipped due to missing metadata

---

## Configuration

### Required Inputs
- **api_key**: Your TMDB API (v3) key from [TMDB](https://www.themoviedb.org/)
- **radarr_api_key**: Your Radarr API key
- **radarr_url**: Your Radarr URL (without http://, include port)
- **sonarr_api_key**: Your Sonarr API key  
- **sonarr_url**: Your Sonarr URL (without http://, include port)

### Optional Inputs
- **user_langs**: Comma-separated list of ISO-639-2 language codes (e.g., "ger,fre,spa")
- **priority**: Service priority - "radarr" or "sonarr" (defaults to Radarr first)
- **commentary**: Boolean to remove commentary tracks (true) or keep them (false)

### Example Configuration
```
user_langs: ger,fre,spa
priority: radarr
api_key: your_tmdb_api_key_here
radarr_api_key: your_radarr_api_key
radarr_url: 192.168.1.2:7878
sonarr_api_key: your_sonarr_api_key
sonarr_url: 192.168.1.2:8989
commentary: false
```

---

## Installation

1. Copy the plugin file to your Tdarr Local plugin library
2. Go to your Tdarr library settings
3. Select "Local" above the Plugin ID field
4. Add the plugin ID: `Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs`
5. Configure all required API keys and URLs
6. Set your preferred user languages and options
7. Save and sync plugins

---

## How It Works

### Normal Operation
1. **File Analysis**: Plugin analyzes the media file and extracts filename/IMDb ID
2. **Service Lookup**: Queries Radarr/Sonarr APIs based on priority setting
3. **TMDB Query**: Uses IMDb ID to get original language from TMDB
4. **Stream Processing**: Analyzes all audio streams and applies language rules
5. **Track Removal**: Removes unwanted language tracks while preserving native + user-specified languages

### Fallback Operation (When Metadata Fails)
1. **Detection**: Plugin detects that TMDB/Radarr/Sonarr lookups failed
2. **English Fallback**: Attempts to identify and keep only English audio tracks
3. **First Track Fallback**: If no English found, keeps the first audio track
4. **Processing**: Applies the same commentary and quality rules to remaining tracks

---

## Known Issues & Community Fixes

### Issue: Duplicate FFmpeg Commands (Fixed by BaileySri)
**Problem**: Plugin sometimes generated malformed FFmpeg commands with duplicate `-map` parameters
**Solution**: Community member BaileySri identified and fixed line conflicts between Radarr and Sonarr processing

### Issue: Commentary Track Removal (Fixed by Routhinator)
**Problem**: Commentary removal caused errors when multiple audio tracks needed removal
**Solution**: Fixed in GitHub issue [HaveAGitGat/Tdarr_Plugins#754](https://github.com/HaveAGitGat/Tdarr_Plugins/issues/754)

---

## Requirements

### Media Management
- **Radarr** and **Sonarr** with TRaSH Guide naming schemes
- Proper IMDb ID embedding in filenames
- TMDB API access

### Dependencies
- `axios@0.27.2` - HTTP client for API calls
- `@cospired/i18n-iso-languages` - Language code conversion

### Recommended Setup
**⚠️ CRITICAL REQUIREMENT**: Your media files **MUST** contain IMDb, TMDB, or TVDB IDs in their filenames for this plugin to work properly. Without these IDs, the plugin will fall back to English-only mode.

Follow the [TRaSH Guides](https://trash-guides.info/) naming conventions that include database IDs:

**Radarr Format (with IMDb ID - RECOMMENDED):**
```
{Movie CleanTitle} {(Release Year)} {imdb-{ImdbId}} {edition-{Edition Tags}}{[Custom Formats]}{[Quality Full]}
```
*Example: `Night of the Living Dead (1968) {imdb-tt0063350} [Bluray-1080p][DTS 5.1][x264]-RELEASE`*

**Alternative Radarr Format (with TMDB ID):**
```
{Movie CleanTitle} {(Release Year)} {tmdb-{TmdbId}} {edition-{Edition Tags}}{[Custom Formats]}{[Quality Full]}
```

**Sonarr Format (with TVDB ID - RECOMMENDED):**
```
{Series TitleYear} - S{season:00}E{episode:00} - {Episode CleanTitle} {tvdb-{TvdbId}} [{Custom Formats}{Quality Full}]
```
*Example: `The Twilight Zone (1959) - S01E01 - Where Is Everybody {tvdb-73752} [WEBDL-1080p][AAC 2.0][x264]-RELEASE`*

**Alternative Sonarr Format (with IMDb ID):**
```
{Series TitleYear} - S{season:00}E{episode:00} - {Episode CleanTitle} {imdb-{ImdbId}} [{Custom Formats}{Quality Full}]
```

**Why Database IDs Matter:**
- **IMDb IDs** (tt1234567): Used directly by TMDB API for language lookup
- **TMDB IDs**: Used for movies when IMDb ID not available  
- **TVDB IDs**: Used for TV series identification
- **Without IDs**: Plugin falls back to English-only mode and may keep first track if no English found

---

## License & Credits

This plugin builds upon the work of multiple contributors:

- **Original Plugin**: henk - Created the foundational plugin
- **First Major Modification**: gsariev - Added user language support and enhanced functionality
- **Community Contributors**: BaileySri, Routhinator - Bug fixes and improvements
- **Current Version**: RecoX - Added intelligent fallback system

This project is open source and contributions are welcome.

---

## Support & Contributing

For issues, suggestions, or contributions:
- Open an issue in this repository
- Check the [original Reddit guide](https://www.reddit.com/r/Tdarr/comments/1cba135/guideplex_optimize_media_for_direct_play_by/) for community discussions
- Review the [gsariev modifications](https://gist.github.com/gssariev/6a89f81e2cc36c35f002e064261118cc) for technical details

## Version History

- **v1.0**: Original henk plugin - Basic native + English language support
- **v1.2**: gsariev modifications - User language support, better API integration
- **v2.0**: RecoX enhancements - Intelligent fallback system, first track protection

---

# Tdarr_Plugin_recox_MP4_Faststart

A companion plugin for MP4 faststart web optimization with intelligent detection and processing.

## Overview

This plugin optimizes MP4 files for web streaming by moving metadata (moov atom) to the beginning of the file, enabling instant playback start without waiting for the entire file to download.

## Features

### Intelligent Detection
- **Automatic Faststart Detection**: Uses FFmpeg trace to detect if files already have faststart enabled
- **Skip Optimized Files**: Only processes files that actually need faststart optimization
- **Atom Position Analysis**: Analyzes moov/mdat atom order to determine current status
- **Container Validation**: Automatically skips non-MP4/MOV files

### Processing Options
- **Stream Preservation**: Copies all video, audio, and subtitle streams without re-encoding
- **Large File Handling**: Optional skip for files over 50GB to avoid long processing times  
- **Force Reprocessing**: Option to reprocess files even if faststart appears enabled
- **Detailed Logging**: Comprehensive status reporting for each file processed

### Performance Benefits
- **Faster Streaming**: Instant playback start for web streaming
- **Better Plex/Jellyfin Performance**: Optimal progressive download behavior
- **Mobile Optimization**: Improved streaming experience on mobile devices
- **HTTP Range Support**: Better seeking and partial content delivery

## Configuration

### Input Parameters
- **skip_large_files**: Skip files over 50GB (default: false)
- **force_reprocess**: Reprocess all files regardless of current status (default: false)

### Example Configuration
```
skip_large_files: false
force_reprocess: false
```

## Installation

1. Copy the plugin file `Tdarr_Plugin_recox_MP4_Faststart.js` to your Tdarr Local plugin library
2. Go to your Tdarr library settings  
3. Select "Local" above the Plugin ID field
4. Add the plugin ID: `Tdarr_Plugin_recox_MP4_Faststart`
5. Configure your preferred options
6. Save and sync plugins

## How It Works

### Detection Process
1. **Container Check**: Validates file is MP4/MOV format
2. **Size Validation**: Optionally skips very large files
3. **FFmpeg Trace**: Analyzes atom structure using `ffmpeg -v trace`
4. **Position Analysis**: Compares moov and mdat atom positions
5. **Status Determination**: Determines if faststart processing is needed

### Processing Workflow
1. **Stream Mapping**: Maps all existing streams (`-map 0`)
2. **Copy Mode**: Copies without re-encoding (`-c copy`)  
3. **Faststart Flag**: Applies `-movflags +faststart`
4. **Timestamp Fix**: Uses `-avoid_negative_ts make_zero`
5. **Optimization**: Moves metadata to file beginning

## Technical Details

### Faststart Detection Logic
```
• Faststart Enabled:  moov atom position < mdat atom position
• Faststart Needed:   mdat atom position < moov atom position  
• Processing Required: Only when faststart needed or force enabled
```

### FFmpeg Command Generated
```bash
ffmpeg -i input.mp4 -map 0 -c copy -movflags +faststart -avoid_negative_ts make_zero output.mp4
```

## Companion to Language Plugin

This faststart plugin is designed to work perfectly with `Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs`:

### Recommended Processing Order
1. **First**: Language plugin (removes unwanted audio tracks)
2. **Second**: Faststart plugin (optimizes for web streaming)

### Combined Benefits
- Clean audio tracks with only desired languages
- Optimized file structure for instant web playback
- Comprehensive media optimization pipeline
- Intelligent processing (skips unnecessary work)

## Requirements

- **FFmpeg**: Must be available in system PATH or Tdarr environment
- **Container Support**: Only processes MP4/MOV files
- **System Resources**: Temporary disk space equal to file size during processing

## Version History

- **v1.0**: Initial release with intelligent faststart detection and processing
