# Tdarr_Plugin_recox_MP4_Faststart

A Tdarr plugin for MP4 faststart web optimization with intelligent metadata analysis and native Tdarr integration.

## Overview

This plugin optimizes MP4 files for web streaming by moving metadata (moov atom) to the beginning of the file, enabling instant playback start without waiting for the entire file to download. Features intelligent detection using Tdarr's built-in ffprobe data to skip files that are already optimized.

## Features

### Intelligent Detection
- **Native Metadata Analysis**: Uses Tdarr's pre-processed ffprobe data for instant detection
- **Skip Optimized Files**: Only processes files that actually need faststart optimization
- **Container Validation**: Automatically skips non-MP4/MOV files
- **Cache File Detection**: Automatically skips Tdarr cache files to prevent infinite loops
- **Zero Dependencies**: No external ffprobe installation required

### Processing Options
- **Stream Preservation**: Copies all video, audio, and subtitle streams without re-encoding
- **Large File Handling**: Optional skip for files over 50GB to avoid long processing times  
- **Force Reprocessing**: Option to reprocess files even if faststart appears enabled
- **Detailed Logging**: Comprehensive status reporting with metadata analysis

### Performance Benefits
- **Faster Streaming**: Instant playbook start for web streaming
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
3. **Cache Detection**: Skips Tdarr cache files to prevent infinite loops
4. **Metadata Analysis**: Analyzes Tdarr's pre-processed ffprobe data
5. **Brand Detection**: Checks MAJOR_BRAND, movflags, and format tags
6. **Optimization Status**: Determines if faststart is already enabled

### Processing Workflow
1. **Stream Mapping**: Maps all existing streams (`-map 0`)
2. **Copy Mode**: Copies without re-encoding (`-c copy`)  
3. **Faststart Flag**: Applies `-movflags +faststart`
4. **Timestamp Fix**: Uses `-avoid_negative_ts make_zero`
5. **Optimization**: Moves metadata to file beginning

## Technical Details

### Detection Method
Uses Tdarr's built-in ffprobe data for instant and reliable faststart detection:

```javascript
// Access Tdarr's pre-processed metadata
const format = file.ffProbeData.format;
const tags = format.tags || {};

// Check for faststart indicators
const faststartIndicators = ['MOVFLAGS', 'movflags', 'MAJOR_BRAND', 'major_brand'];

for (const indicator of faststartIndicators) {
  if (tags[indicator]) {
    const value = tags[indicator].toLowerCase();
    if (value.includes('faststart') || value.includes('isom')) {
      return true; // Faststart detected
    }
  }
}
```

### Why Native Tdarr Data?
1. **Instant Analysis**: Uses existing metadata, no external process calls
2. **Zero Dependencies**: No ffprobe installation required in containers
3. **Reliability**: Same data used by other Tdarr plugins
4. **Performance**: Instant detection with no timeout concerns
5. **Native Integration**: Follows official Tdarr plugin patterns

### FFmpeg Commands
```bash
# Processing command (no detection commands needed)
ffmpeg -i input.mp4 -map 0 -c copy -movflags +faststart -avoid_negative_ts make_zero output.mp4
```

### Performance Metrics
Based on production testing with native Tdarr integration:
- **Detection Time**: Instant analysis using existing metadata
- **Processing Speed**: Copy-only operation (no re-encoding)
- **File Size Impact**: Minimal overhead from metadata repositioning
- **Success Rate**: High reliability using proven Tdarr data structures
- **Container Compatibility**: Works in any Tdarr environment without dependencies

## Companion Plugin Usage

This faststart plugin is designed to work perfectly with `Tdarr_Plugin_recox_Keep_Native_Lang_Plus_User_Langs`:

### Recommended Processing Order
1. **First**: Language plugin (removes unwanted audio tracks)
2. **Second**: Faststart plugin (optimizes for web streaming)

### Combined Benefits
- Clean audio tracks with only desired languages
- Optimized file structure for instant web playbook
- Comprehensive media optimization pipeline
- Intelligent processing that skips unnecessary work

## Requirements

### System Requirements
- **Tdarr**: Plugin uses native Tdarr ffprobe data (no external dependencies)
- **Container Support**: Only processes MP4/MOV files
- **System Resources**: Temporary disk space equal to file size during processing

### Tdarr Environment
- **Stage**: Pre-processing
- **Operation Type**: Transcode
- **Plugin Version**: 2.0

## Troubleshooting

### Common Issues
1. **No Metadata Available**: Ensure Tdarr has properly scanned the file
2. **Permission Errors**: Check file system permissions for temp directory
3. **Large File Timeouts**: Enable `skip_large_files` for very large media
4. **Infinite Processing**: Plugin automatically detects and skips cache files

### Performance Tips
- Use SSD storage for temporary processing space
- Monitor system resources during batch processing
- Consider `skip_large_files` option for very large libraries
- Check logs for metadata analysis information


- Native Tdarr ffprobe data integration
- Instant metadata analysis (no external calls)
- Zero container dependencies
- Follows official Tdarr plugin patterns
- Enhanced reliability and performance
- Simplified codebase (40 lines vs 80+ lines)

## License

This plugin is open source and contributions are welcome. Built following official Tdarr plugin patterns and best practices.
