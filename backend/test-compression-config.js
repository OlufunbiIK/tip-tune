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

// Check 1: Shared compression middleware is imported
const hasCompressionFactoryImport = mainTsContent.includes("createCompressionMiddleware");

console.log('✓ Check 1: Compression middleware import');
console.log(`  - createCompressionMiddleware import: ${hasCompressionFactoryImport ? '✓ PASS' : '✗ FAIL'}`);

// Check 2: Shared middleware file contains binary endpoint filter
const compressionFilePath = path.join(__dirname, 'src', 'common', 'middleware', 'response-compression.middleware.ts');
const compressionFileContent = fs.readFileSync(compressionFilePath, 'utf8');
const hasShouldCompressFunction = compressionFileContent.includes('export function shouldCompress');
const hasBinaryPatterns = compressionFileContent.includes('/files/upload') &&
                          compressionFileContent.includes('/files/[^/]+/stream') &&
                          compressionFileContent.includes('/files/[^/]+/?');

console.log('\n✓ Check 2: Binary endpoint filter');
console.log(`  - shouldCompress function: ${hasShouldCompressFunction ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  - Binary endpoint patterns: ${hasBinaryPatterns ? '✓ PASS' : '✗ FAIL'}`);

// Check 3: Compression middleware is configured
const hasCompressionMiddleware = mainTsContent.includes('app.use(createCompressionMiddleware())');
const hasThresholdConfig = compressionFileContent.includes('threshold: 1024');
const hasBrotliConfig = compressionFileContent.includes('brotli: {') &&
                        compressionFileContent.includes('BROTLI_PARAM_QUALITY');
const hasFilterConfig = compressionFileContent.includes('filter: shouldCompress');

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
  hasCompressionFactoryImport,
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
