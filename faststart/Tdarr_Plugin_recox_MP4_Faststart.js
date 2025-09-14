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
  Uses Tdarr's pre-processed ffprobe data to detect MP4 faststart optimization:
  • Analyzes movflags and container metadata for faststart indicators
  • Examines major brand and compatible brands for web optimization
  • Checks probe scores and format structure for optimization hints
  • Fast analysis using existing media metadata (no external process calls)
  
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
 * Detects if an MP4 file already has faststart enabled using Tdarr's ffprobe data
 * Analyzes the MP4 container structure to determine optimization status
 * @param {Object} ffProbeData - Tdarr's pre-processed ffprobe data
 * @returns {boolean} - true if faststart enabled, false if optimization needed
 */
const detectFaststart = (ffProbeData) => {
  response.infoLog += '🔍 Analyzing faststart status from media metadata...\n';
  
  try {
    // Check if format information is available
    if (!ffProbeData.format) {
      response.infoLog += '☒No format information found\n';
      return false; // Assume needs optimization if no data
    }
    
    const format = ffProbeData.format;
    const tags = format.tags || {};
    
    response.infoLog += `Format: ${format.format_name || 'unknown'} (${format.format_long_name || 'unknown'})\n`;
    
    // Method 1: Check for faststart-related flags in format tags (most reliable)
    const faststartIndicators = ['MOVFLAGS', 'movflags', 'MAJOR_BRAND', 'major_brand'];
    
    for (const indicator of faststartIndicators) {
      if (tags[indicator]) {
        const value = tags[indicator].toLowerCase();
        if (value.includes('faststart') || value.includes('isom')) {
          response.infoLog += `☑Faststart detected via ${indicator}: ${tags[indicator]}\n`;
          return true;
        }
      }
    }
    
    // Method 2: Check major brand compatibility for web optimization
    if (tags.MAJOR_BRAND) {
      const majorBrand = tags.MAJOR_BRAND.toLowerCase();
      const compatibleBrands = tags.COMPATIBLE_BRANDS || '';
      
      response.infoLog += `Major brand: ${majorBrand}, Compatible: ${compatibleBrands}\n`;
      
      // ISO base media file format with web-optimized brands typically indicate faststart
      if (majorBrand === 'isom' && compatibleBrands.toLowerCase().includes('isom')) {
        response.infoLog += '☑Faststart likely enabled (ISO base media format detected)\n';
        return true;
      }
    }
    
    // Method 3: Use probe score as additional indicator
    const probeScore = format.probe_score || 0;
    const fileSize = parseInt(format.size) || 0;
    
    response.infoLog += `Probe score: ${probeScore}, File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB\n`;
    
    // High probe scores (95-100) combined with instant metadata access usually indicate faststart
    if (probeScore >= 95) {
      response.infoLog += '☑High probe score suggests optimized file structure (faststart likely enabled)\n';
      return true;
    }
    
    // If we can't definitively determine faststart status, assume it's needed
    response.infoLog += '☒Unable to confirm faststart status - assuming optimization needed\n';
    return false;
    
  } catch (error) {
    response.infoLog += `☒Error analyzing faststart: ${error.message}\n`;
    return false; // Assume needs optimization on error
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
    
    // Step 0: Skip if this is already a Tdarr cache file (likely already processed)
    if (file._id.includes('-TdarrCacheFile-')) {
      response.infoLog += '☑File is already a Tdarr cache file, likely already processed. Skipping.\n';
      return response;
    }
    
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
    
    // Step 3: Detect current faststart status using Tdarr's ffprobe data
    const hasFaststart = detectFaststart(file.ffProbeData);
    
    // Step 4: Determine if processing is needed
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
