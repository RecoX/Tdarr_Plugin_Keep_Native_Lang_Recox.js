# Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs

A modified Tdarr plugin for keeping native language and user-specified audio tracks with intelligent fallback handling.

## Overview

This plugin intelligently manages audio tracks by keeping only the native language (detected via TMDB API) and user-specified languages, with robust fallback mechanisms when metadata lookup fails.

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

## Installation

1. Copy the plugin file to your Tdarr Local plugin library
2. Go to your Tdarr library settings
3. Select "Local" above the Plugin ID field
4. Add the plugin ID: `Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs`
5. Configure all required API keys and URLs
6. Set your preferred user languages and options
7. Save and sync plugins

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

## Requirements

### Media Management
- **Radarr** and **Sonarr** with TRaSH Guide naming schemes
- Proper IMDb ID embedding in filenames
- TMDB API access

### Dependencies
- `axios@0.27.2` - HTTP client for API calls
- `@cospired/i18n-iso-languages` - Language code conversion

### Critical Requirement: Database IDs in Filenames

**⚠️ CRITICAL**: Your media files **MUST** contain IMDb, TMDB, or TVDB IDs in their filenames for this plugin to work properly. Without these IDs, the plugin will fall back to English-only mode.

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

## Known Issues & Community Fixes

### Issue: Duplicate FFmpeg Commands (Fixed by BaileySri)
**Problem**: Plugin sometimes generated malformed FFmpeg commands with duplicate `-map` parameters
**Solution**: Community member BaileySri identified and fixed line conflicts between Radarr and Sonarr processing

### Issue: Commentary Track Removal (Fixed by Routhinator)
**Problem**: Commentary removal caused errors when multiple audio tracks needed removal
**Solution**: Fixed in GitHub issue [HaveAGitGat/Tdarr_Plugins#754](https://github.com/HaveAGitGat/Tdarr_Plugins/issues/754)

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
- **Repository**: [Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs](https://github.com/RecoX/Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs)
- **Key Enhancements**:
  - **Intelligent Fallback System**: When metadata lookup fails, the plugin now falls back to keeping English tracks only
  - **First Track Protection**: If no English tracks are found in fallback mode, keeps the first audio track to prevent silent movies
  - **Better Error Handling**: No longer skips files entirely when TMDB/Radarr/Sonarr lookups fail
  - **Enhanced Logging**: More detailed information about fallback decisions

## Version History

- **v1.0**: Original henk plugin - Basic native + English language support
- **v1.2**: gsariev modifications - User language support, better API integration
- **v2.0**: RecoX enhancements - Intelligent fallback system, first track protection

## License & Credits

This plugin builds upon the work of multiple contributors:

- **Original Plugin**: henk - Created the foundational plugin
- **First Major Modification**: gsariev - Added user language support and enhanced functionality
- **Community Contributors**: BaileySri, Routhinator - Bug fixes and improvements
- **Current Version**: RecoX - Added intelligent fallback system

This project is open source and contributions are welcome.

## Support & Contributing

For issues, suggestions, or contributions:
- Open an issue in this repository
- Check the [original Reddit guide](https://www.reddit.com/r/Tdarr/comments/1cba135/guideplex_optimize_media_for_direct_play_by/) for community discussions
- Review the [gsariev modifications](https://gist.github.com/gssariev/6a89f81e2cc36c35f002e064261118cc) for technical details
