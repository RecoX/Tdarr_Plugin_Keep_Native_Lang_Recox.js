# Tdarr_Plugin_Keep_Native_Lang_Recox.js

A Tdarr plugin for keeping only native language audio and subtitle tracks while removing other language tracks to save storage space.

## Description

This plugin analyzes video files and preserves only the tracks in your native language (configurable, defaults to English), removing all other language tracks. This helps reduce file sizes by removing unnecessary language tracks while maintaining your preferred viewing experience.

## Features

- **Preserves Native Language**: Keeps all audio and subtitle tracks in your specified native language
- **Removes Other Languages**: Automatically removes audio/subtitle tracks in other languages
- **Configurable Language**: Set your native language code (e.g., 'eng', 'spa', 'fre', 'ger', 'jpn')
- **No Transcoding**: Uses stream copying to maintain original quality and fast processing
- **Smart Fallback**: If no native language tracks are found, keeps the first audio track as fallback
- **Safe Processing**: Only processes files that actually have multiple language tracks

## Configuration

The plugin accepts one input parameter:

- **nativeLanguage** (default: 'eng'): Your native language code
  - Examples: 'eng' (English), 'spa' (Spanish), 'fre' (French), 'ger' (German), 'jpn' (Japanese)

## How It Works

1. **Analysis**: Scans all streams in the video file
2. **Language Detection**: Identifies tracks by their language metadata tags
3. **Selection**: Keeps video streams and native language audio/subtitle streams
4. **Removal**: Excludes all non-native language tracks
5. **Remuxing**: Uses FFmpeg stream copying for fast, lossless processing

## Use Cases

- **Multi-language Media**: Perfect for international content with multiple audio/subtitle tracks
- **Storage Optimization**: Reduce file sizes by removing unused language tracks
- **Library Cleanup**: Standardize your media collection to only include your preferred language
- **Streaming Efficiency**: Smaller files mean faster streaming and less bandwidth usage

## Technical Details

- **Type**: Video
- **Operation**: Remux (no transcoding)
- **Mode**: FFmpeg
- **Container**: Preserves original container format
- **Quality**: Lossless (stream copy only)

## Installation

1. Place the `Tdarr_Plugin_Keep_Native_Lang_Recox.js` file in your Tdarr plugins directory
2. Restart Tdarr server
3. The plugin will appear in the plugin library under "Keep Native Language - RecoX"

## Example Scenarios

### Before Processing
```
Video Stream: H.264
Audio Stream 0: English (eng) - AC3
Audio Stream 1: Spanish (spa) - AC3  
Audio Stream 2: French (fre) - AC3
Subtitle Stream 0: English (eng)
Subtitle Stream 1: Spanish (spa)
Subtitle Stream 2: French (fre)
```

### After Processing (with nativeLanguage: 'eng')
```
Video Stream: H.264
Audio Stream 0: English (eng) - AC3
Subtitle Stream 0: English (eng)
```

## Requirements

- Tdarr v2.x
- FFmpeg (for stream processing)
- Video files with language metadata tags

## License

Open source - feel free to modify and distribute

## Version History

- **v1.00**: Initial release with configurable native language support

## Support

For issues or feature requests, please check the GitHub repository.