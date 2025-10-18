const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Server: Core logic and rule enforcement
class GameManager {
  constructor() {
    this.gameState = {
      gameId: 'DEMO-' + Math.random().toString(36).substr(2, 9),
      phase: 'WAITING_FOR_PLAYERS',
      players: new Map(),
      currentTurn: null,
      messageLog: [],
    };
    console.log(
      '[SERVER] Core logic initialized with Game ID:',
      this.gameState.gameId
    );
  }

  addPlayer(playerId, playerData) {
    console.log('[SERVER] Adding player:', playerId, playerData);
    this.gameState.players.set(playerId, {
      id: playerId,
      name: playerData.name,
      character: playerData.character,
      joinedAt: new Date().toISOString(),
    });
    this.logMessage(
      `Player ${playerData.name} joined as ${playerData.character}`
    );
    return { success: true, gameState: this.getPublicState() };
  }

  removePlayer(playerId) {
    console.log('[SERVER] Removing player:', playerId);
    const player = this.gameState.players.get(playerId);
    if (player) {
      this.gameState.players.delete(playerId);
      this.logMessage(`Player ${player.name} left the game`);
    }
  }

  processGameAction(playerId, action) {
    console.log(
      '[SERVER] Processing and validating action from',
      playerId,
      ':',
      action.type
    );
    this.logMessage(
      `${this.gameState.players.get(playerId)?.name} performed ${action.type}`
    );
    return { success: true, action: action.type };
  }

  logMessage(message) {
    const timestamp = new Date().toISOString();
    this.gameState.messageLog.push({ timestamp, message });
    console.log(`[SERVER] ${timestamp}: ${message}`);
  }

  getPublicState() {
    return {
      gameId: this.gameState.gameId,
      phase: this.gameState.phase,
      playerCount: this.gameState.players.size,
      players: Array.from(this.gameState.players.values()),
      messageLog: this.gameState.messageLog.slice(-10), // Last 10 messages
    };
  }
}

// Network: Communication layer (Socket.IO)
class CommunicationManager {
  constructor(io, gameManager) {
    this.io = io;
    this.gameManager = gameManager;
    this.connectedClients = new Map();
    console.log('[NETWORK] Socket.IO communication layer initialized');
  }

  handleConnection(socket) {
    console.log('[NETWORK] New client connected:', socket.id);
    this.connectedClients.set(socket.id, {
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
    });

    // Message: Client Registration
    socket.on('join_game', (playerData) => {
      console.log(
        '[NETWORK] Received JOIN_GAME message, routing to server:',
        playerData
      );
      const result = this.gameManager.addPlayer(socket.id, playerData);

      // Response: Send acknowledgment
      socket.emit('game_joined', result);

      // Broadcast: Notify other players
      socket.broadcast.emit('player_joined', {
        player: this.gameManager.gameState.players.get(socket.id),
      });

      // Update all clients with new game state
      this.broadcastGameState();
    });

    // Message: Game Action
    socket.on('game_action', (action) => {
      console.log(
        '[NETWORK] Received GAME_ACTION message, routing to server:',
        action
      );
      const result = this.gameManager.processGameAction(socket.id, action);

      // Broadcast action to all clients
      this.io.emit('action_processed', {
        playerId: socket.id,
        action: action,
        result: result,
        timestamp: new Date().toISOString(),
      });

      this.broadcastGameState();
    });

    // Message: Request game state
    socket.on('get_game_state', () => {
      console.log(
        '[NETWORK] Received GET_GAME_STATE request, routing to server from:',
        socket.id
      );
      socket.emit('game_state_update', this.gameManager.getPublicState());
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('[NETWORK] Client disconnected:', socket.id);
      this.gameManager.removePlayer(socket.id);
      this.connectedClients.delete(socket.id);

      // Notify remaining clients
      socket.broadcast.emit('player_left', { playerId: socket.id });
      this.broadcastGameState();
    });
  }

  broadcastGameState() {
    const gameState = this.gameManager.getPublicState();
    console.log('[NETWORK] Broadcasting server state update to all clients');
    this.io.emit('game_state_update', gameState);
  }

  getConnectionStats() {
    return {
      connectedClients: this.connectedClients.size,
      activeGames: 1,
      uptime: process.uptime(),
    };
  }
}

// Server: Player data validation (part of server logic)
class PlayerManager {
  constructor() {
    this.availableCharacters = [
      'Miss Scarlet',
      'Colonel Mustard',
      'Mrs. White',
      'Mr. Green',
      'Mrs. Peacock',
      'Professor Plum',
    ];
    console.log(
      '[SERVER] Player validation logic initialized with characters:',
      this.availableCharacters
    );
  }

  validatePlayer(playerData) {
    console.log('[SERVER] Validating player data:', playerData);
    if (!playerData.name || !playerData.character) {
      return { valid: false, error: 'Name and character required' };
    }
    if (!this.availableCharacters.includes(playerData.character)) {
      return { valid: false, error: 'Invalid character selection' };
    }
    return { valid: true };
  }

  getAvailableCharacters(gameManager) {
    const usedCharacters = Array.from(
      gameManager.gameState.players.values()
    ).map((p) => p.character);
    return this.availableCharacters.filter(
      (char) => !usedCharacters.includes(char)
    );
  }
}

// ===== INITIALIZE ARCHITECTURE COMPONENTS =====
const gameManager = new GameManager();
const playerManager = new PlayerManager();
const communicationManager = new CommunicationManager(io, gameManager);

// ===== MESSAGE HANDLING =====
io.on('connection', (socket) => {
  communicationManager.handleConnection(socket);
});

// ===== DEMO ENDPOINTS FOR SUBSYSTEM COMMUNICATION =====
app.get('/api/demo/status', (req, res) => {
  console.log('[API] Status request received');
  res.json({
    system: 'Clue-Less Skeletal Increment',
    architecture: {
      server: 'ACTIVE',
      network: 'ACTIVE',
      clientInterface: 'READY',
    },
    gameState: gameManager.getPublicState(),
    connectionStats: communicationManager.getConnectionStats(),
    availableCharacters: playerManager.getAvailableCharacters(gameManager),
  });
});

app.get('/api/demo/messages', (req, res) => {
  console.log('[API] Message log request received');
  res.json({
    messageLog: gameManager.gameState.messageLog,
    connectionCount: communicationManager.connectedClients.size,
  });
});

// Simulate inter-subsystem communication
app.post('/api/demo/simulate-action', (req, res) => {
  console.log('[API] Simulating subsystem communication...');

  // Simulate Server → Network layer message
  const simulatedAction = {
    type: 'SYSTEM_MESSAGE',
    message: 'Demonstrating subsystem communication',
    timestamp: new Date().toISOString(),
  };

  gameManager.logMessage('DEMO: Inter-subsystem message sent');
  communicationManager.broadcastGameState();

  res.json({
    message: 'Subsystem communication demonstrated',
    action: simulatedAction,
    gameState: gameManager.getPublicState(),
  });
});

// ===== SERVER STARTUP =====
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log('=====================================');
  console.log('   CLUE-LESS MESSAGING DEMO');
  console.log('=====================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📡 SRS Section 4.1 Architecture initialized:');
  console.log('   ✓ Server: Core logic and rule enforcement');
  console.log('   ✓ Network: Socket.IO communication layer');
  console.log('   ✓ Client: Web-based GUI (connect via browser)');
  console.log('');
  console.log('🔗 Demo endpoints:');
  console.log(`   📊 Status: http://localhost:${PORT}/api/demo/status`);
  console.log(`   📝 Messages: http://localhost:${PORT}/api/demo/messages`);
  console.log(
    `   ⚡ Simulate: POST http://localhost:${PORT}/api/demo/simulate-action`
  );
  console.log('');
  console.log('🎯 Socket.IO Events:');
  console.log('   join_game → game_joined');
  console.log('   game_action → action_processed');
  console.log('   get_game_state → game_state_update');
  console.log('=====================================');

  // Log initial system state
  gameManager.logMessage('System initialized and ready for demo');
});
