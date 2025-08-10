#!/usr/bin/env node

/**
 * Test script to verify sample data insertion works
 * Run: npm run sample-data:test
 */
console.log('🧪 Testing sample data script compilation...');

try {
  require('./insert-sample-data');
  console.log('✅ Script compiled successfully!');
  console.log('📝 To run the script: npm run sample-data');
} catch (error) {
  console.error('❌ Script compilation failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
