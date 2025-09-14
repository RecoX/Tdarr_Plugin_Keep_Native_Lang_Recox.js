/* eslint-disable no-await-in-loop */
const { execSync } = require('child_process');

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
  Uses FFmpeg trace to detect moov/mdat atom order:
  • Faststart enabled: moov atom before mdat atom
  • Faststart needed: mdat atom before moov atom (metadata at end)
  
  PROCESSING:
  • Copies all streams without re-encoding (fast operation)
  • Applies -movflags +faststart to move metadata to beginning
  • Only processes MP4/MOV containers that need optimization`,
  Version: '1.0',
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
 * Detects if MP4 file already has faststart enabled by checking moov/mdat atom order
 * @param {string} filePath - Full path to the video file
 * @returns {boolean} - True if faststart is already enabled, false if needs processing
 */
const detectFaststart = (filePath) => {
  try {
    response.infoLog += 'Detecting faststart status...\n';
    
    // Use FFmpeg trace to detect atom order
    // We need to escape the file path for shell execution
    const escapedPath = filePath.replace(/"/g, '\\"');
    const command = `ffmpeg -v trace -i "${escapedPath}" -f null - 2>&1`;
    
    response.infoLog += 'Running faststart detection command...\n';
    
    const output = execSync(command, { 
      encoding: 'utf8', 
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    // Look for moov and mdat atom positions
    const mdatMatch = output.match(/type:'mdat'.*?parent:'root'.*?sz:\s*(\d+)\s+(\d+)/);
    const moovMatch = output.match(/type:'moov'.*?parent:'root'.*?sz:\s*(\d+)\s+(\d+)/);
    
    if (!mdatMatch || !moovMatch) {
      response.infoLog += '☒Could not detect atom positions. File may not be a valid MP4.\n';
      return null; // Unable to determine
    }
    
    const mdatPosition = parseInt(mdatMatch[2], 10);
    const moovPosition = parseInt(moovMatch[2], 10);
    
    response.infoLog += `mdat atom position: ${mdatPosition}\n`;
    response.infoLog += `moov atom position: ${moovPosition}\n`;
    
    // Faststart enabled if moov comes before mdat
    const hasFaststart = moovPosition < mdatPosition;
    
    if (hasFaststart) {
      response.infoLog += '☑Faststart already enabled (moov before mdat)\n';
    } else {
      response.infoLog += '☒Faststart needed (mdat before moov)\n';
    }
    
    return hasFaststart;
  } catch (error) {
    response.infoLog += `☒Error detecting faststart: ${error.message}\n`;
    return null; // Unable to determine, skip processing
  }
};

/**
 * Validates that the file is a supported container type
 * @param {Object} file - Tdarr file object
 * @returns {boolean} - True if file type is supported for faststart
 */
const isSupportedContainer = (file) => {
  const supportedContainers = ['mp4', 'mov', 'm4v'];
  const container = file.container.toLowerCase();
  
  if (!supportedContainers.includes(container)) {
    response.infoLog += `☒Unsupported container: ${container}. Faststart only supports MP4/MOV files.\n`;
    return false;
  }
  
  response.infoLog += `☑Supported container: ${container}\n`;
  return true;
};

/**
 * Checks if file size exceeds the skip threshold when skip_large_files is enabled
 * @param {Object} file - Tdarr file object
 * @param {boolean} skipLargeFiles - Whether to skip large files
 * @returns {boolean} - True if file should be skipped due to size
 */
const shouldSkipLargeFile = (file, skipLargeFiles) => {
  if (!skipLargeFiles) return false;
  
  const fileSizeGB = file.file_size / (1024 * 1024 * 1024);
  const maxSizeGB = 50;
  
  if (fileSizeGB > maxSizeGB) {
    response.infoLog += `☒Skipping large file (${fileSizeGB.toFixed(2)}GB > ${maxSizeGB}GB limit)\n`;
    return true;
  }
  
  response.infoLog += `File size: ${fileSizeGB.toFixed(2)}GB (within limits)\n`;
  return false;
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
    
    // Step 1: Validate container type
    if (!isSupportedContainer(file)) {
      return response; // Skip non-MP4/MOV files
    }
    
    // Step 2: Check file size limits if enabled
    if (shouldSkipLargeFile(file, inputs.skip_large_files)) {
      return response; // Skip large files if option enabled
    }
    
    // Step 3: Detect current faststart status
    const hasFaststart = detectFaststart(file._id);
    
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
    
    // Step 5: Setup FFmpeg command for faststart processing
    response.infoLog += '☑Setting up faststart processing...\n';
    response.preset = ', -map 0 -c copy -movflags +faststart -avoid_negative_ts make_zero';
    response.processFile = true;
    
    response.infoLog += '☑Faststart processing configured:\n';
    response.infoLog += '  • All streams copied without re-encoding\n';
    response.infoLog += '  • Metadata will be moved to beginning of file\n';
    response.infoLog += '  • File will be optimized for web streaming\n';
    response.infoLog += '\n';
    
  } catch (error) {
    response.infoLog += `☒Unexpected error in faststart plugin: ${error.message}\n`;
    response.processFile = false;
  }
  
  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
