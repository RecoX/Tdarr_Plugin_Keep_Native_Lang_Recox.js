# Tdarr Plugin Collection by RecoX

A collection of modified Tdarr plugins for comprehensive media optimization with intelligent handling.

## Plugins in This Repository

### 1. Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs
A modified plugin for keeping native language and user-specified audio tracks with intelligent fallback handling.
- **📖 [Detailed Documentation](plugins/README_Native_Lang.md)**
- **🔧 Configuration**: Requires TMDB, Radarr, and Sonarr API keys
- **🎯 Purpose**: Intelligent audio track management with native language detection

### 2. Tdarr_Plugin_recox_MP4_Faststart  
A companion plugin for MP4 faststart web optimization with intelligent detection.
- **📖 [Detailed Documentation](plugins/README_Faststart.md)**
- **🔧 Configuration**: Optional size limits and force processing
- **🎯 Purpose**: Web streaming optimization with timing-based detection

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

## Quick Start

### For Native Language Plugin
1. Get API keys from TMDB, Radarr, and Sonarr
2. Ensure your media files include database IDs in filenames (TRaSH Guide naming)
3. Install and configure the plugin with your API keys
4. **📖 [Complete Setup Guide](plugins/README_Native_Lang.md)**

### For MP4 Faststart Plugin
1. Ensure FFmpeg is available in your Tdarr environment
2. Install the plugin (no API keys required)
3. Optionally configure size limits
4. **📖 [Complete Setup Guide](plugins/README_Faststart.md)**

### Recommended Usage Together
Use both plugins in sequence for comprehensive media optimization:
1. **First**: Native Language plugin (removes unwanted audio)
2. **Second**: Faststart plugin (optimizes for streaming)

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
- **📖 Plugin-specific documentation**: See individual README files in the `/plugins` directory
- Check the [original Reddit guide](https://www.reddit.com/r/Tdarr/comments/1cba135/guideplex_optimize_media_for_direct_play_by/) for community discussions
- Review the [gsariev modifications](https://gist.github.com/gssariev/6a89f81e2cc36c35f002e064261118cc) for technical details

## Repository Structure

```
├── README.md                           # This overview file
├── plugin/                             # Legacy location
│   └── Tdarr_Plugin_recox_MP4_Faststart.js
├── plugins/                            # Current plugin location
│   ├── README_Native_Lang.md           # Native language plugin docs
│   ├── README_Faststart.md             # Faststart plugin docs
│   ├── Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs.js
│   └── Tdarr_Plugin_recox_MP4_Faststart.js
```

## Version History

### Plugin Collection
- **v2.0**: Split documentation, updated faststart detection method
- **v1.2**: Added MP4 Faststart companion plugin

### Individual Plugin Versions
- **Native Language Plugin**: v2.0 - Intelligent fallback system
- **MP4 Faststart Plugin**: v1.1 - Timing-based detection method
