/**
 * Test script to verify compression middleware configuration
 * This script validates the compression setup without requiring a running server
 */

const fs = require('fs');
const path = require('path');

console.log('=== Compression Configuration Verification ===\n');

// Read main.ts to verify compression configuration
const mainTsPath = path.join(__dirname, 'src', 'main.ts');
const mainTsContent = fs.readFileSync(mainTsPath, 'utf8');

// Check 1: Compression package is imported
const hasCompressionImport = mainTsContent.includes("import * as compression from 'compression'");
const hasZlibImport = mainTsContent.includes("import * as zlib from 'zlib'");

console.log('✓ Check 1: Compression imports');
console.log(`  - compression package: ${hasCompressionImport ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  - zlib package: ${hasZlibImport ? '✓ PASS' : '✗ FAIL'}`);

// Check 2: shouldCompress filter function exists
const hasShouldCompressFunction = mainTsContent.includes('function shouldCompress');
const hasBinaryPatterns = mainTsContent.includes('tracks') &&
                          mainTsContent.includes('stream') &&
                          mainTsContent.includes('download') &&
                          mainTsContent.includes('storage');

console.log('\n✓ Check 2: Binary endpoint filter');
console.log(`  - shouldCompress function: ${hasShouldCompressFunction ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  - Binary endpoint patterns: ${hasBinaryPatterns ? '✓ PASS' : '✗ FAIL'}`);

// Check 3: Compression middleware is configured
const hasCompressionMiddleware = mainTsContent.includes('app.use(compression(');
const hasThresholdConfig = mainTsContent.includes("threshold: '1kb'") || mainTsContent.includes('threshold: 1024');
const hasBrotliConfig = mainTsContent.includes('brotli: {') && 
                        mainTsContent.includes('enabled: true') &&
                        mainTsContent.includes('BROTLI_PARAM_QUALITY');
const hasFilterConfig = mainTsContent.includes('filter: shouldCompress');

console.log('\n✓ Check 3: Compression middleware configuration');
console.log(`  - Middleware registered: ${hasCompressionMiddleware ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  - Threshold (1KB): ${hasThresholdConfig ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  - Brotli enabled: ${hasBrotliConfig ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  - Custom filter: ${hasFilterConfig ? '✓ PASS' : '✗ FAIL'}`);

// Check 4: Middleware positioning (after CORS, before routes)
const corsIndex = mainTsContent.indexOf('enableCors');
const compressionIndex = mainTsContent.indexOf('app.use(compression(');
const routesIndex = mainTsContent.indexOf('setGlobalPrefix');

const correctPositioning = corsIndex > 0 && 
                          compressionIndex > corsIndex && 
                          compressionIndex < routesIndex;

console.log('\n✓ Check 4: Middleware positioning');
console.log(`  - After CORS, before routes: ${correctPositioning ? '✓ PASS' : '✗ FAIL'}`);

// Check 5: Package.json dependencies
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const hasCompressionDep = packageJson.dependencies && packageJson.dependencies.compression;
const hasCompressionTypes = packageJson.devDependencies && packageJson.devDependencies['@types/compression'];

console.log('\n✓ Check 5: Package dependencies');
console.log(`  - compression package: ${hasCompressionDep ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  - @types/compression: ${hasCompressionTypes ? '✓ PASS' : '✗ FAIL'}`);

// Summary
const allChecks = [
  hasCompressionImport,
  hasZlibImport,
  hasShouldCompressFunction,
  hasBinaryPatterns,
  hasCompressionMiddleware,
  hasThresholdConfig,
  hasBrotliConfig,
  hasFilterConfig,
  correctPositioning,
  hasCompressionDep,
  hasCompressionTypes
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log('\n=== Summary ===');
console.log(`Passed: ${passedChecks}/${totalChecks} checks`);

if (passedChecks === totalChecks) {
  console.log('\n✓ All compression configuration checks passed!');
  console.log('The compression middleware is properly configured.');
  process.exit(0);
} else {
  console.log('\n✗ Some checks failed. Please review the configuration.');
  process.exit(1);
}
