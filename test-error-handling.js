// Test script to demonstrate error handling for screenshots
// Run this after starting the server to generate validation errors

const io = require('socket.io-client');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to test error handling scenarios');
  
  // Test 1: Invalid character selection (should trigger validation error)
  console.log('\n=== Testing Character Validation Error ===');
  socket.emit('join_game', {
    name: 'TestPlayer',
    character: 'Invalid Character Name'  // This will trigger validation
  });
  
  setTimeout(() => {
    // Test 2: Missing required fields (should trigger validation error)  
    console.log('\n=== Testing Missing Fields Error ===');
    socket.emit('join_game', {
      name: '',  // Empty name should trigger validation
      character: 'Miss Scarlet'
    });
  }, 1000);
  
  setTimeout(() => {
    // Test 3: Duplicate character selection
    console.log('\n=== Testing Duplicate Character Error ===');
    socket.emit('join_game', {
      name: 'TestPlayer2',
      character: 'Miss Scarlet'  // If someone already picked this, should error
    });
  }, 2000);
  
  setTimeout(() => {
    // Test 4: Invalid game action format
    console.log('\n=== Testing Invalid Action Error ===');
    socket.emit('game_action', {
      // Missing required action type - should trigger validation
      invalidField: 'test'
    });
  }, 3000);
  
  setTimeout(() => {
    console.log('\n=== Error handling demonstration complete ===');
    process.exit(0);
  }, 4000);
});

socket.on('game_joined', (result) => {
  if (!result.success) {
    console.log(`✓ Validation Error Captured: ${result.error}`);
  } else {
    console.log('✓ Join successful');
  }
});

socket.on('error', (error) => {
  console.log('Socket error:', error);
});