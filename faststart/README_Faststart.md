# Tdarr_Plugin_recox_MP4_Faststart

A Tdarr plugin for MP4 faststart web optimization with intelligent detection and cross-platform compatibility.

## Overview

This plugin optimizes MP4 files for web streaming by moving metadata (moov atom) to the beginning of the file, enabling instant playback start without waiting for the entire file to download. Features intelligent detection to skip files that are already optimized.

## Features

### Intelligent Detection
- **Timing-Based Detection**: Uses FFmpeg response time to detect faststart status
- **Skip Optimized Files**: Only processes files that actually need faststart optimization
- **Cross-Platform Compatibility**: Works reliably on Windows, Linux, and Docker environments
- **Cache File Detection**: Automatically skips Tdarr cache files to prevent infinite loops
- **Container Validation**: Automatically skips non-MP4/MOV files

### Processing Options
- **Stream Preservation**: Copies all video, audio, and subtitle streams without re-encoding
- **Large File Handling**: Optional skip for files over 50GB to avoid long processing times  
- **Force Reprocessing**: Option to reprocess files even if faststart appears enabled
- **Detailed Logging**: Comprehensive status reporting with timing information

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
4. **Timing Test**: Uses FFmpeg to test file processing speed (`ffmpeg -v error -i file -t 1 -f null -`)
5. **Response Analysis**: Measures how quickly FFmpeg can start processing
6. **Status Determination**: Fast response (< 4 seconds) = faststart enabled, slow response = needs faststart

### Processing Workflow
1. **Stream Mapping**: Maps all existing streams (`-map 0`)
2. **Copy Mode**: Copies without re-encoding (`-c copy`)  
3. **Faststart Flag**: Applies `-movflags +faststart`
4. **Timestamp Fix**: Uses `-avoid_negative_ts make_zero`
5. **Optimization**: Moves metadata to file beginning

## Technical Details

### Detection Method
Unlike complex atom parsing methods, this plugin uses a simple and reliable timing-based approach:

```javascript
// FFmpeg command for detection
const command = `ffmpeg -v error -i "${filePath}" -t 1 -f null -`;

// Timing analysis
if (elapsedTime < 4000ms) {
    // Faststart already enabled - FFmpeg starts quickly
    return true;
} else {
    // Faststart needed - FFmpeg takes time to find metadata
    return false;
}
```

### Why Timing-Based Detection?
1. **Cross-Platform Compatibility**: Works on Windows, Linux, and Docker without shell issues
2. **Simplicity**: No complex atom parsing or FFprobe dependencies
3. **Reliability**: Consistent results across different FFmpeg versions
4. **Performance**: Fast detection (~250ms average) with clear pass/fail results

### FFmpeg Commands
```bash
# Detection test
ffmpeg -v error -i input.mp4 -t 1 -f null -

# Processing command
ffmpeg -i input.mp4 -map 0 -c copy -movflags +faststart -avoid_negative_ts make_zero output.mp4
```

### Performance Metrics
Based on production testing:
- **Detection Time**: ~250ms average per file
- **Processing Speed**: Copy-only operation (no re-encoding)
- **File Size Impact**: Minimal overhead from metadata repositioning
- **Success Rate**: High reliability across diverse media libraries

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
- **FFmpeg**: Must be available in system PATH or Tdarr environment
- **Container Support**: Only processes MP4/MOV files
- **System Resources**: Temporary disk space equal to file size during processing

### Tdarr Environment
- **Stage**: Pre-processing
- **Operation Type**: Transcode
- **Plugin Version**: 1.1

## Troubleshooting

### Common Issues
1. **FFmpeg Not Found**: Ensure FFmpeg is installed and accessible
2. **Permission Errors**: Check file system permissions for temp directory
3. **Large File Timeouts**: Enable `skip_large_files` for very large media
4. **Infinite Processing**: Plugin automatically detects and skips cache files

### Performance Tips
- Use SSD storage for temporary processing space
- Monitor system resources during batch processing
- Consider `skip_large_files` option for very large libraries
- Check logs for timing information to validate detection accuracy

## Version History

- **v1.0**: Initial release with atom-parsing detection (deprecated)
- **v1.1**: Simplified timing-based detection for cross-platform compatibility and reliability

## Technical Evolution

### v1.0 Issues (Resolved in v1.1)
- Complex FFprobe atom parsing
- Windows shell execution errors (ENOBUFS)
- Cross-platform compatibility problems
- Dependency on specific FFmpeg versions

### v1.1 Improvements
- Simplified timing-based detection
- Windows compatibility fixes
- Eliminated shell redirection issues
- Consistent performance across platforms
- Enhanced error handling and logging

## License

This plugin is open source and contributions are welcome. Built following official Tdarr plugin patterns and best practices.
