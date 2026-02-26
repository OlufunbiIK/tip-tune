#!/usr/bin/env node

/**
 * Compression Measurement Script
 * 
 * This script measures the effectiveness of HTTP response compression
 * on key API endpoints by comparing response sizes with different
 * compression algorithms (brotli, gzip, none).
 * 
 * Usage: node scripts/measure-compression.js
 * 
 * Requirements: Server must be running on the configured port
 */

const http = require('http');
const https = require('https');
const zlib = require('zlib');
const { performance } = require('perf_hooks');

// Configuration
const config = {
  host: process.env.API_HOST || 'localhost',
  port: process.env.API_PORT || 3001,
  protocol: process.env.API_PROTOCOL || 'http',
  baseUrl: '',
};

config.baseUrl = `${config.protocol}://${config.host}:${config.port}`;

// Endpoints to measure
const endpoints = [
  {
    name: 'Track Listings',
    path: '/api/tracks?limit=50',
    method: 'GET',
    description: 'List of tracks with metadata',
  },
  {
    name: 'Tip History',
    path: '/api/tips/user/test-user-id/history?limit=50',
    method: 'GET',
    description: 'User tip transaction history',
  },
  {
    name: 'Search Results',
    path: '/api/search?q=music&limit=30',
    method: 'GET',
    description: 'Search results for tracks and artists',
  },
  {
    name: 'Activity Feed',
    path: '/api/activities?limit=30',
    method: 'GET',
    description: 'User activity feed',
  },
];

// Compression algorithms to test
const compressionTypes = [
  { name: 'None', encoding: '', decompress: null },
  { name: 'Gzip', encoding: 'gzip', decompress: zlib.gunzipSync },
  { name: 'Brotli', encoding: 'br', decompress: zlib.brotliDecompressSync },
];

/**
 * Make HTTP request with specified compression encoding
 */
function makeRequest(endpoint, acceptEncoding) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.path, config.baseUrl);
    const client = config.protocol === 'https' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || config.port,
      path: url.pathname + url.search,
      method: endpoint.method,
      headers: {
        'Accept': 'application/json',
      },
    };
    
    if (acceptEncoding) {
      options.headers['Accept-Encoding'] = acceptEncoding;
    }
    
    const startTime = performance.now();
    
    const req = client.request(options, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const buffer = Buffer.concat(chunks);
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer,
          size: buffer.length,
          responseTime,
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

/**
 * Measure compression for a single endpoint
 */
async function measureEndpoint(endpoint) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Measuring: ${endpoint.name}`);
  console.log(`Endpoint: ${endpoint.method} ${endpoint.path}`);
  console.log(`Description: ${endpoint.description}`);
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const compression of compressionTypes) {
    try {
      const response = await makeRequest(endpoint, compression.encoding);
      
      if (response.statusCode !== 200) {
        console.log(`⚠️  ${compression.name}: Status ${response.statusCode} - Skipping`);
        continue;
      }
      
      let decompressedSize = response.size;
      let decompressTime = 0;
      
      // Decompress if needed to get original size
      if (compression.decompress && response.headers['content-encoding']) {
        const decompressStart = performance.now();
        try {
          const decompressed = compression.decompress(response.body);
          decompressedSize = decompressed.length;
          decompressTime = performance.now() - decompressStart;
        } catch (error) {
          console.log(`⚠️  ${compression.name}: Decompression failed - ${error.message}`);
          continue;
        }
      }
      
      const compressionRatio = compression.encoding 
        ? ((1 - response.size / decompressedSize) * 100).toFixed(2)
        : 0;
      
      const result = {
        algorithm: compression.name,
        encoding: response.headers['content-encoding'] || 'none',
        compressedSize: response.size,
        decompressedSize: decompressedSize,
        compressionRatio: parseFloat(compressionRatio),
        responseTime: response.responseTime.toFixed(2),
        decompressTime: decompressTime.toFixed(2),
        varyHeader: response.headers['vary'] || 'none',
      };
      
      results.push(result);
      
      console.log(`\n${compression.name}:`);
      console.log(`  Content-Encoding: ${result.encoding}`);
      console.log(`  Compressed Size: ${formatBytes(result.compressedSize)}`);
      console.log(`  Decompressed Size: ${formatBytes(result.decompressedSize)}`);
      console.log(`  Compression Ratio: ${result.compressionRatio}%`);
      console.log(`  Response Time: ${result.responseTime}ms`);
      if (decompressTime > 0) {
        console.log(`  Decompress Time: ${result.decompressTime}ms`);
      }
      console.log(`  Vary Header: ${result.varyHeader}`);
      
    } catch (error) {
      console.log(`❌ ${compression.name}: ${error.message}`);
    }
  }
  
  return {
    endpoint: endpoint.name,
    path: endpoint.path,
    results,
  };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculate network transfer time savings
 */
function calculateTransferTimeSavings(originalSize, compressedSize, connectionSpeed) {
  const originalTime = (originalSize * 8) / connectionSpeed; // Convert to seconds
  const compressedTime = (compressedSize * 8) / connectionSpeed;
  const savings = originalTime - compressedTime;
  return (savings * 1000).toFixed(2); // Convert to milliseconds
}

/**
 * Generate summary report
 */
function generateSummary(allResults) {
  console.log(`\n${'='.repeat(80)}`);
  console.log('COMPRESSION EFFECTIVENESS SUMMARY');
  console.log('='.repeat(80));
  
  for (const endpointResult of allResults) {
    console.log(`\n${endpointResult.endpoint}:`);
    
    const noneResult = endpointResult.results.find(r => r.algorithm === 'None');
    const gzipResult = endpointResult.results.find(r => r.algorithm === 'Gzip');
    const brotliResult = endpointResult.results.find(r => r.algorithm === 'Brotli');
    
    if (!noneResult) {
      console.log('  ⚠️  No baseline measurement available');
      continue;
    }
    
    const originalSize = noneResult.decompressedSize;
    
    if (gzipResult) {
      const savings3G = calculateTransferTimeSavings(originalSize, gzipResult.compressedSize, 384000); // 3G: 384 Kbps
      const savings4G = calculateTransferTimeSavings(originalSize, gzipResult.compressedSize, 10000000); // 4G: 10 Mbps
      console.log(`  Gzip: ${gzipResult.compressionRatio}% reduction`);
      console.log(`    Savings: ${formatBytes(originalSize - gzipResult.compressedSize)}`);
      console.log(`    Transfer time saved (3G): ${savings3G}ms`);
      console.log(`    Transfer time saved (4G): ${savings4G}ms`);
    }
    
    if (brotliResult) {
      const savings3G = calculateTransferTimeSavings(originalSize, brotliResult.compressedSize, 384000);
      const savings4G = calculateTransferTimeSavings(originalSize, brotliResult.compressedSize, 10000000);
      console.log(`  Brotli: ${brotliResult.compressionRatio}% reduction`);
      console.log(`    Savings: ${formatBytes(originalSize - brotliResult.compressedSize)}`);
      console.log(`    Transfer time saved (3G): ${savings3G}ms`);
      console.log(`    Transfer time saved (4G): ${savings4G}ms`);
    }
    
    // Check if meets 40% reduction target
    const meetsTarget = (brotliResult && brotliResult.compressionRatio >= 40) || 
                       (gzipResult && gzipResult.compressionRatio >= 40);
    if (meetsTarget) {
      console.log(`  ✅ Meets 40% compression target`);
    } else {
      console.log(`  ⚠️  Does not meet 40% compression target`);
    }
  }
  
  return allResults;
}

/**
 * Export results to JSON
 */
function exportResults(allResults) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    configuration: config,
    measurements: allResults,
  };
  
  const fs = require('fs');
  const outputPath = 'compression-measurements.json';
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Results exported to: ${outputPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Starting Compression Measurement');
  console.log(`Server: ${config.baseUrl}`);
  console.log(`Endpoints to measure: ${endpoints.length}`);
  
  // Check if server is running
  try {
    await makeRequest({ path: '/health', method: 'GET' }, '');
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running or not accessible');
    console.error(`   Please start the server at ${config.baseUrl}`);
    process.exit(1);
  }
  
  const allResults = [];
  
  for (const endpoint of endpoints) {
    try {
      const result = await measureEndpoint(endpoint);
      allResults.push(result);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`\n❌ Failed to measure ${endpoint.name}: ${error.message}`);
    }
  }
  
  generateSummary(allResults);
  exportResults(allResults);
  
  console.log('\n✅ Compression measurement complete\n');
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { makeRequest, measureEndpoint, formatBytes };
