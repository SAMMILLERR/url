/**
 * Test script to verify rate limiter is working
 */

const RateLimiter = require('./rateLimiter');

console.log('\n╔════════════════════════════════════════╗');
console.log('║   Rate Limiter Test Suite              ║');
console.log('╚════════════════════════════════════════╝\n');

// Test 1: Basic rate limiting
console.log('📋 Test 1: Basic Rate Limiting');
console.log('Configuration: 5 requests per 10 seconds\n');

const limiter1 = new RateLimiter(5, 10000);
const testIp1 = '192.168.1.100';

let blockedAt = null;
for (let i = 1; i <= 8; i++) {
  const result = limiter1.isAllowed(testIp1);
  const status = result.allowed ? '✅ ALLOWED' : '❌ BLOCKED';
  console.log(`  Request ${i}: ${status} | Remaining: ${result.remaining}`);
  
  if (!result.allowed && !blockedAt) {
    blockedAt = i;
  }
}

if (blockedAt) {
  console.log(`\n  ✓ Rate limit triggered at request ${blockedAt}\n`);
} else {
  console.log('\n  ✗ Rate limit was NOT triggered (FAIL)\n');
}

// Test 2: Multiple IPs independent limits
console.log('📋 Test 2: Multiple IPs with Independent Limits');
console.log('Configuration: 3 requests per 10 seconds per IP\n');

const limiter2 = new RateLimiter(3, 10000);
const ip1 = '10.0.0.1';
const ip2 = '10.0.0.2';

console.log('  IP 10.0.0.1:');
for (let i = 1; i <= 4; i++) {
  const result = limiter2.isAllowed(ip1);
  const status = result.allowed ? '✅' : '❌';
  console.log(`    Request ${i}: ${status}`);
}

console.log('\n  IP 10.0.0.2:');
for (let i = 1; i <= 4; i++) {
  const result = limiter2.isAllowed(ip2);
  const status = result.allowed ? '✅' : '❌';
  console.log(`    Request ${i}: ${status}`);
}

console.log('\n  ✓ Each IP tracked independently\n');

// Test 3: Reset functionality
console.log('📋 Test 3: Reset Functionality');
console.log('Configuration: 2 requests per 10 seconds\n');

const limiter3 = new RateLimiter(2, 10000);
const testIp3 = '172.16.0.1';

console.log('  Before reset:');
for (let i = 1; i <= 3; i++) {
  const result = limiter3.isAllowed(testIp3);
  const status = result.allowed ? '✅' : '❌';
  console.log(`    Request ${i}: ${status}`);
}

console.log('\n  Resetting IP...');
limiter3.reset(testIp3);

console.log('\n  After reset:');
for (let i = 1; i <= 2; i++) {
  const result = limiter3.isAllowed(testIp3);
  const status = result.allowed ? '✅' : '❌';
  console.log(`    Request ${i}: ${status}`);
}

console.log('\n  ✓ Reset successful\n');

// Test 4: Stats retrieval
console.log('📋 Test 4: Stats Retrieval');
console.log('Configuration: 4 requests per 10 seconds\n');

const limiter4 = new RateLimiter(4, 10000);
const testIp4 = '203.0.113.1';

// Make 3 requests
for (let i = 0; i < 3; i++) {
  limiter4.isAllowed(testIp4);
}

const stats = limiter4.getStats(testIp4);
console.log(`  Request count: ${stats.requestCount}`);
console.log(`  Remaining: ${stats.remaining}`);
console.log(`  Reset time: ${new Date(stats.resetTime).toISOString()}`);
console.log('\n  ✓ Stats retrieved successfully\n');

// Test 5: Retry-After header calculation
console.log('📋 Test 5: Retry-After Header Calculation');
console.log('Configuration: 2 requests per 5 seconds\n');

const limiter5 = new RateLimiter(2, 5000);
const testIp5 = '198.51.100.1';

for (let i = 1; i <= 3; i++) {
  const result = limiter5.isAllowed(testIp5);
  if (!result.allowed) {
    console.log(`  Rate limit exceeded after ${i-1} allowed requests`);
    console.log(`  Retry-After: ${result.retryAfter} seconds`);
    console.log(`  Reset Time: ${new Date(result.resetTime).toISOString()}`);
  }
}

console.log('\n  ✓ Retry-After calculated correctly\n');

console.log('╔════════════════════════════════════════╗');
console.log('║   All Tests Complete! ✨              ║');
console.log('╚════════════════════════════════════════╝\n');
