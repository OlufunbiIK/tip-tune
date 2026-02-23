const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Configuration
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const URL = `http://localhost:${PORT}/notifications`;

// Mock User Data
const userId = 'test-user-id';
const payload = {
  sub: userId,
  walletAddress: 'test-wallet',
  isArtist: true
};

// Generate Token
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

console.log(`Connecting to ${URL} with token...`);

const socket = io(URL, {
  auth: { token },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ Successfully connected to WebSocket server!');
  console.log(`   Socket ID: ${socket.id}`);
  
  // Verify we are in the correct room (requires server logs to confirm fully, but connection implies auth success)
  console.log('   Authentication passed (otherwise we would be disconnected)');
  
  // Keep alive for a moment then exit
  setTimeout(() => {
    console.log('Closing connection...');
    socket.close();
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    console.error('❌ Server disconnected us (likely auth failure)');
    process.exit(1);
  }
});
