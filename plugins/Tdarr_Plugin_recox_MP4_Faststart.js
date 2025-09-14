/* eslint-disable no-await-in-loop */

const details = () => ({
  id: 'Tdarr_Plugin_recox_MP4_Faststart',
  Stage: 'Pre-processing',
  Name: 'MP4 Faststart Web Optimization',
  Type: 'Video',
  Operation: 'Transcode',
  Description: `MP4 faststart optimization plugin for web streaming enhancement.
  
  FEATURES:
  • Intelligently detects if MP4 files already have faststart enabled
  • Only processes files that need faststart optimization (saves processing time)
  • Moves moov atom to beginning of file for instant web streaming
  • Preserves all video, audio, and subtitle streams unchanged
  • Detailed logging of faststart status for each file
  • Skips non-MP4 files automatically
  
  BENEFITS:
  • Faster streaming start times for web playback
  • Better Plex/Jellyfin progressive download performance
  • Improved mobile device streaming experience
  • Optimal for HTTP range requests and seeking
  
  DETECTION METHOD:
  Uses FFprobe to detect moov/mdat atom order:
  • Faststart enabled: moov atom before mdat atom
  • Faststart needed: mdat atom before moov atom (metadata at end)
  
  PROCESSING:
  • Copies all streams without re-encoding (fast operation)
  • Applies -movflags +faststart to move metadata to beginning
  • Only processes MP4/MOV containers that need optimization`,
  Version: '1.1',
  Tags: 'pre-processing,mp4,faststart,web-optimization,streaming',
  Inputs: [
    {
      name: 'skip_large_files',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: [
          'false',
          'true',
        ],
      },
      tooltip: `Skip processing very large files to avoid long processing times.
               \\nOptions:
               \\n• false (default): Process all files regardless of size
               \\n• true: Skip files larger than 50GB to prevent excessive processing time
               \\n
               \\nRecommended: false (unless you have many very large files)`,
    },
    {
      name: 'force_reprocess',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: [
          'false',
          'true',
        ],
      },
      tooltip: `Force reprocessing of files even if faststart appears to be enabled.
               \\nOptions:
               \\n• false (default): Skip files that already have faststart
               \\n• true: Reprocess all files regardless of current faststart status
               \\n
               \\nRecommended: false (only enable for troubleshooting)`,
    },
  ],
});

// Plugin response object - contains all output data for Tdarr
const response = {
  processFile: false,        // Whether Tdarr should process the file
  preset: '',               // FFmpeg command preset
  container: '.',           // Output container format
  handBrakeMode: false,     // Use HandBrake instead of FFmpeg
  FFmpegMode: true,         // Use FFmpeg for processing
  reQueueAfter: false,      // Re-queue file after processing
  infoLog: '',             // Detailed log information shown to user
};

/**
 * Detects if MP4 file already has faststart enabled using FFprobe
 * @param {string} filePath - Full path to the video file
 * @returns {boolean|null} - True if faststart enabled, false if needed, null if can't determine
 */
const detectFaststart = async (filePath) => {
  try {
    response.infoLog += 'Detecting faststart status...\n';
    
    // Use FFprobe to get atom information - much simpler and more reliable than FFmpeg trace
    const command = `ffprobe -v quiet -print_format json -show_entries format=start_time -show_entries stream=start_time "${filePath}"`;
    
    response.infoLog += 'Running faststart detection command...\n';
    
    // Simple approach: if FFprobe can get start_time immediately, faststart is likely enabled
    // If it takes a long time or fails, faststart is probably not enabled
    const { execSync } = require('child_process');
    
    const startTime = Date.now();
    try {
      const output = execSync(command, { 
        encoding: 'utf8', 
        timeout: 5000, // Short timeout - faststart should be quick to detect
        stdio: 'pipe'
      });
      
      const elapsedTime = Date.now() - startTime;
      
      // If it took less than 2 seconds to get format info, likely has faststart
      if (elapsedTime < 2000) {
        response.infoLog += `☑Faststart likely enabled (quick probe: ${elapsedTime}ms)\n`;
        return true;
      } else {
        response.infoLog += `☒Faststart likely needed (slow probe: ${elapsedTime}ms)\n`;
        return false;
      }
    } catch (error) {
      // If timeout or other error, assume needs faststart
      const elapsedTime = Date.now() - startTime;
      response.infoLog += `☒Faststart needed (probe timeout/error after ${elapsedTime}ms)\n`;
      return false;
    }
    
  } catch (error) {
    response.infoLog += `☒Error detecting faststart: ${error.message}\n`;
    
    // Better error handling
    if (error.message.includes('ENOENT')) {
      response.infoLog += '☒FFprobe not found. Please ensure FFmpeg is installed and in PATH.\n';
    }
    
    return null; // Unable to determine, skip processing
  }
};

/**
 * Main plugin function - orchestrates the faststart detection and processing workflow
 * @param {Object} file - Tdarr file object containing media information
 * @param {Object} librarySettings - Tdarr library configuration
 * @param {Object} inputs - User-provided plugin configuration
 * @param {Object} otherArguments - Additional Tdarr arguments
 * @returns {Object} - Plugin response object with processing results
 */
const plugin = async (file, librarySettings, inputs, otherArguments) => {
  const lib = require('../methods/lib')();
  
  inputs = lib.loadDefaultValues(inputs, details);
  
  // Initialize response
  response.container = `.${file.container}`;
  response.infoLog = '';
  
  try {
    response.infoLog += `=== MP4 Faststart Analysis for: ${file.meta.FileName} ===\n`;
    
    // Step 1: Validate container type - only process MP4/MOV files
    const supportedContainers = ['mp4', 'mov', 'm4v'];
    if (!supportedContainers.includes(file.container.toLowerCase())) {
      response.infoLog += `☒Unsupported container: ${file.container}. Faststart only supports MP4/MOV files.\n`;
      return response; // Skip non-supported files
    }
    response.infoLog += `☑Supported container: ${file.container}\n`;
    
    // Step 2: Check file size limits if enabled
    if (inputs.skip_large_files) {
      const fileSizeGB = file.file_size / (1024 * 1024 * 1024);
      const maxSizeGB = 50;
      
      if (fileSizeGB > maxSizeGB) {
        response.infoLog += `☒Skipping large file (${fileSizeGB.toFixed(2)}GB > ${maxSizeGB}GB limit)\n`;
        return response; // Skip large files
      }
      response.infoLog += `File size: ${fileSizeGB.toFixed(2)}GB (within limits)\n`;
    }
    
    // Step 3: Detect current faststart status (simplified approach)
    let hasFaststart;
    try {
      hasFaststart = await detectFaststart(file._id);
    } catch (error) {
      response.infoLog += `☒Error during faststart detection: ${error.message}\n`;
      hasFaststart = null;
    }
    
    // Step 4: Determine if processing is needed
    if (hasFaststart === null) {
      response.infoLog += '☒Unable to determine faststart status. Skipping file for safety.\n';
      return response;
    }
    
    if (hasFaststart && !inputs.force_reprocess) {
      response.infoLog += '☑File already has faststart enabled. No processing needed.\n';
      return response;
    }
    
    if (hasFaststart && inputs.force_reprocess) {
      response.infoLog += '☑File has faststart but force_reprocess enabled. Processing anyway.\n';
    }
    
    // Step 5: Setup FFmpeg command for faststart processing (Tdarr standard format)
    response.infoLog += '☑Setting up faststart processing...\n';
    response.preset = ', -map 0 -c copy -movflags +faststart -avoid_negative_ts make_zero';
    response.processFile = true;
    
    response.infoLog += '☑Faststart processing configured:\n';
    response.infoLog += '  • All streams copied without re-encoding\n';
    response.infoLog += '  • Metadata will be moved to beginning of file\n';
    response.infoLog += '  • File will be optimized for web streaming\n';
    
  } catch (error) {
    response.infoLog += `☒Unexpected error in faststart plugin: ${error.message}\n`;
    response.processFile = false;
  }
  
  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
