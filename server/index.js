const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// SKELETAL INCREMENT - Basic Data Structures
let gameState = {
  players: {},
  gameStarted: false,
  currentPlayer: null,
  turnOrder: [],
  board: initializeBoard(),
  cards: initializeCards(),
  gamePhase: 'waiting',
};

// Core Data Structure: 3x3 Grid with Hallway Nodes
function initializeBoard() {
  console.log('[SERVER] Initializing board data structures...');

  return {
    // 3x3 Grid of Rooms
    rooms: {
      study: { name: 'Study', position: { row: 0, col: 0 }, players: [] },
      hall: { name: 'Hall', position: { row: 0, col: 1 }, players: [] },
      lounge: { name: 'Lounge', position: { row: 0, col: 2 }, players: [] },
      library: { name: 'Library', position: { row: 1, col: 0 }, players: [] },
      billiard: {
        name: 'Billiard Room',
        position: { row: 1, col: 1 },
        players: [],
      },
      dining: {
        name: 'Dining Room',
        position: { row: 1, col: 2 },
        players: [],
      },
      conservatory: {
        name: 'Conservatory',
        position: { row: 2, col: 0 },
        players: [],
      },
      ballroom: { name: 'Ballroom', position: { row: 2, col: 1 }, players: [] },
      kitchen: { name: 'Kitchen', position: { row: 2, col: 2 }, players: [] },
    },

    // Hallway Nodes (connecting adjacent rooms)
    hallways: {
      'study-hall': {
        name: 'Study-Hall',
        player: null,
        connects: ['study', 'hall'],
      },
      'hall-lounge': {
        name: 'Hall-Lounge',
        player: null,
        connects: ['hall', 'lounge'],
      },
      'study-library': {
        name: 'Study-Library',
        player: null,
        connects: ['study', 'library'],
      },
      'hall-billiard': {
        name: 'Hall-Billiard',
        player: null,
        connects: ['hall', 'billiard'],
      },
      'lounge-dining': {
        name: 'Lounge-Dining',
        player: null,
        connects: ['lounge', 'dining'],
      },
      'library-billiard': {
        name: 'Library-Billiard',
        player: null,
        connects: ['library', 'billiard'],
      },
      'billiard-dining': {
        name: 'Billiard-Dining',
        player: null,
        connects: ['billiard', 'dining'],
      },
      'library-conservatory': {
        name: 'Library-Conservatory',
        player: null,
        connects: ['library', 'conservatory'],
      },
      'billiard-ballroom': {
        name: 'Billiard-Ballroom',
        player: null,
        connects: ['billiard', 'ballroom'],
      },
      'dining-ballroom': {
        name: 'Dining-Ballroom',
        player: null,
        connects: ['dining', 'ballroom'],
      },
      'conservatory-ballroom': {
        name: 'Conservatory-Ballroom',
        player: null,
        connects: ['conservatory', 'ballroom'],
      },
      'ballroom-kitchen': {
        name: 'Ballroom-Kitchen',
        player: null,
        connects: ['ballroom', 'kitchen'],
      },
    },
  };
}

// Initialize Clue game cards
function initializeCards() {
  console.log('[SERVER] Initializing game cards...');

  const characters = [
    'Prof. Plum',
    'Mrs. Peacock',
    'Mr. Green',
    'Miss Scarlet',
    'Col. Mustard',
    'Mrs. White',
  ];
  const weapons = [
    'Candlestick',
    'Knife',
    'Lead Pipe',
    'Revolver',
    'Rope',
    'Wrench',
  ];
  const rooms = [
    'Study',
    'Hall',
    'Lounge',
    'Library',
    'Billiard Room',
    'Dining Room',
    'Conservatory',
    'Ballroom',
    'Kitchen',
  ];

  return {
    characters,
    weapons,
    rooms,
  };
}

// Starting positions for characters in hallways
const startingPositions = {
  'Prof. Plum': 'study-library',
  'Mrs. Peacock': 'lounge-dining',
  'Mr. Green': 'conservatory-ballroom',
  'Miss Scarlet': 'hall-lounge',
  'Col. Mustard': 'billiard-dining',
  'Mrs. White': 'ballroom-kitchen',
};

// SKELETAL INCREMENT - Basic Communication Protocol
io.on('connection', (socket) => {
  console.log(`[SERVER] New client connected: ${socket.id}`);

  // Basic Message Passing: Client Registration
  socket.on('joinGame', (playerData) => {
    console.log(`[SERVER] Player joining: ${JSON.stringify(playerData)}`);

    const { name, character } = playerData;

    // Check if character is available
    if (
      Object.values(gameState.players).some((p) => p.character === character)
    ) {
      socket.emit('error', { message: 'Character already taken' });
      console.log(`[SERVER] Character ${character} already taken`);
      return;
    }

    // Add player to game state
    gameState.players[socket.id] = {
      id: socket.id,
      name,
      character,
      location: startingPositions[character],
      isReady: false,
    };

    // Place character in starting hallway
    gameState.board.hallways[startingPositions[character]].player = character;

    // Confirm join and send current state
    socket.emit('gameJoined', {
      playerId: socket.id,
      gameState: getPublicGameState(),
    });

    // Notify other players
    socket.broadcast.emit('playerJoined', {
      player: gameState.players[socket.id],
    });

    console.log(
      `[SERVER] Player ${name} (${character}) joined at ${startingPositions[character]}`
    );
    logGameState();
  });

  // Basic Turn-Taking Flow
  socket.on('playerReady', () => {
    console.log(`[SERVER] Player ${socket.id} marked ready`);

    if (gameState.players[socket.id]) {
      gameState.players[socket.id].isReady = true;

      const playerCount = Object.keys(gameState.players).length;
      const readyCount = Object.values(gameState.players).filter(
        (p) => p.isReady
      ).length;

      console.log(`[SERVER] Ready players: ${readyCount}/${playerCount}`);

      // Start game if all players ready (minimum 2 for skeletal demo)
      if (
        playerCount >= 2 &&
        readyCount === playerCount &&
        !gameState.gameStarted
      ) {
        startGame();
      }

      // Update all clients
      io.emit('gameStateUpdate', getPublicGameState());
    }
  });

  // Basic Movement Message
  socket.on('makeMove', (moveData) => {
    console.log(
      `[SERVER] Move request from ${socket.id}: ${JSON.stringify(moveData)}`
    );

    if (gameState.currentPlayer !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    const result = processBasicMove(socket.id, moveData);
    console.log(`[SERVER] Move result: ${JSON.stringify(result)}`);

    if (result.success) {
      // Update game state and notify all clients
      io.emit('gameStateUpdate', getPublicGameState());
      io.emit('moveResult', result);

      // Basic turn advancement
      nextTurn();
      io.emit('gameStateUpdate', getPublicGameState());
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  // Handle suggestion
  socket.on('makeSuggestion', (suggestionData) => {
    console.log(
      `[SERVER] Suggestion from ${socket.id}: ${JSON.stringify(suggestionData)}`
    );

    if (gameState.currentPlayer !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    const player = gameState.players[socket.id];

    // Can only make suggestion if in a room (not hallway)
    if (player.location.includes('-')) {
      socket.emit('error', {
        message: 'Can only make suggestions when in a room',
      });
      return;
    }

    const result = processSuggestion(socket.id, suggestionData);
    console.log(`[SERVER] Suggestion result: ${JSON.stringify(result)}`);

    if (result.success) {
      io.emit('suggestionMade', result);
      io.emit('gameStateUpdate', getPublicGameState());

      // Advance turn after suggestion
      nextTurn();
      io.emit('gameStateUpdate', getPublicGameState());
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  // Handle accusation
  socket.on('makeAccusation', (accusationData) => {
    console.log(
      `[SERVER] Accusation from ${socket.id}: ${JSON.stringify(accusationData)}`
    );

    if (gameState.currentPlayer !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    const result = processAccusation(socket.id, accusationData);
    console.log(`[SERVER] Accusation result: ${JSON.stringify(result)}`);

    io.emit('accusationMade', result);

    if (result.correct) {
      // Game ends - player wins
      gameState.gamePhase = 'ended';
      io.emit('gameEnded', { winner: gameState.players[socket.id] });
    } else {
      // Player eliminated, continue game
      gameState.players[socket.id].eliminated = true;
      nextTurn();
      io.emit('gameStateUpdate', getPublicGameState());
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[SERVER] Client disconnected: ${socket.id}`);

    if (gameState.players[socket.id]) {
      const player = gameState.players[socket.id];

      // Remove player from their location
      if (player.location.includes('-')) {
        gameState.board.hallways[player.location].player = null;
      } else {
        const roomPlayers = gameState.board.rooms[player.location].players;
        const index = roomPlayers.indexOf(player.character);
        if (index > -1) roomPlayers.splice(index, 1);
      }

      delete gameState.players[socket.id];

      console.log(`[SERVER] Player ${player.name} removed from game`);
      logGameState();

      socket.broadcast.emit('playerLeft', { playerId: socket.id });
      io.emit('gameStateUpdate', getPublicGameState());
    }
  });
});

// SKELETAL INCREMENT - Basic Game Flow Functions
function startGame() {
  console.log('[SERVER] Starting game...');

  gameState.gameStarted = true;
  gameState.gamePhase = 'playing';
  gameState.turnOrder = Object.keys(gameState.players);
  gameState.currentPlayer = gameState.turnOrder[0];

  console.log(
    `[SERVER] Turn order: ${gameState.turnOrder
      .map((id) => gameState.players[id].name)
      .join(', ')}`
  );
  console.log(
    `[SERVER] Current player: ${
      gameState.players[gameState.currentPlayer].name
    }`
  );

  io.emit('gameStarted', { gameState: getPublicGameState() });
  logGameState();
}

function processBasicMove(playerId, moveData) {
  const player = gameState.players[playerId];
  const { destination } = moveData;

  console.log(
    `[SERVER] Processing move: ${player.name} from ${player.location} to ${destination}`
  );

  // Basic movement validation
  if (player.location.includes('-')) {
    // Player in hallway - can move to connected rooms
    const hallway = gameState.board.hallways[player.location];
    if (!hallway.connects.includes(destination)) {
      return { success: false, error: 'Invalid move from hallway' };
    }

    // Move to room
    gameState.board.hallways[player.location].player = null;
    gameState.board.rooms[destination].players.push(player.character);
    player.location = destination;

    console.log(
      `[SERVER] Moved ${player.character} from hallway to ${destination}`
    );
    return { success: true, movedToRoom: true };
  } else {
    // Player in room - can move to connected hallways
    const room = gameState.board.rooms[player.location];

    if (destination.includes('-')) {
      // Moving to hallway
      const hallway = gameState.board.hallways[destination];
      if (!hallway || hallway.player !== null) {
        return { success: false, error: 'Hallway is occupied or invalid' };
      }

      if (!hallway.connects.includes(player.location)) {
        return {
          success: false,
          error: 'Hallway not connected to current room',
        };
      }

      // Move to hallway
      const roomPlayers = gameState.board.rooms[player.location].players;
      const index = roomPlayers.indexOf(player.character);
      if (index > -1) roomPlayers.splice(index, 1);

      gameState.board.hallways[destination].player = player.character;
      player.location = destination;

      console.log(
        `[SERVER] Moved ${player.character} from room to hallway ${destination}`
      );
      return { success: true, movedToHallway: true };
    }

    return { success: false, error: 'Invalid room-to-room move' };
  }
}

function processSuggestion(playerId, suggestionData) {
  const player = gameState.players[playerId];
  const { character, weapon } = suggestionData;
  const currentRoom = gameState.board.rooms[player.location];

  if (!currentRoom) {
    return { success: false, error: 'Must be in a room to make suggestion' };
  }

  // The room is automatically the current room
  const room = currentRoom.name;

  console.log(
    `[SERVER] Processing suggestion: ${character} with ${weapon} in ${room}`
  );

  // Move suggested character to the room if they're a player
  const suggestedPlayer = Object.values(gameState.players).find(
    (p) => p.character === character
  );
  if (suggestedPlayer) {
    // Remove from current location
    if (suggestedPlayer.location.includes('-')) {
      gameState.board.hallways[suggestedPlayer.location].player = null;
    } else {
      const roomPlayers =
        gameState.board.rooms[suggestedPlayer.location].players;
      const index = roomPlayers.indexOf(suggestedPlayer.character);
      if (index > -1) roomPlayers.splice(index, 1);
    }

    // Move to suggestion room
    gameState.board.rooms[player.location].players.push(character);
    suggestedPlayer.location = player.location;
    suggestedPlayer.lastMovedByPlayer = playerId;

    console.log(`[SERVER] Moved ${character} to ${room} for suggestion`);
  }

  return {
    success: true,
    suggestion: { character, weapon, room },
    suggestedBy: player.name,
    playerId: playerId,
  };
}

function processAccusation(playerId, accusationData) {
  const player = gameState.players[playerId];
  const { character, weapon, room } = accusationData;

  console.log(
    `[SERVER] Processing accusation: ${character} with ${weapon} in ${room}`
  );

  // For skeletal increment, we'll just simulate checking against a solution
  // In a full implementation, this would check against the actual solution cards
  const mockSolution = {
    character: 'Prof. Plum',
    weapon: 'Candlestick',
    room: 'Library',
  };

  const isCorrect =
    character === mockSolution.character &&
    weapon === mockSolution.weapon &&
    room === mockSolution.room;

  return {
    success: !player.eliminated,
    accusation: { character, weapon, room },
    accusedBy: player.name,
    correct: isCorrect,
    playerId: playerId,
  };
}

function nextTurn() {
  const currentIndex = gameState.turnOrder.indexOf(gameState.currentPlayer);
  const nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
  gameState.currentPlayer = gameState.turnOrder[nextIndex];

  console.log(
    `[SERVER] Turn advanced to: ${
      gameState.players[gameState.currentPlayer].name
    }`
  );
}

function getPublicGameState() {
  return {
    players: Object.fromEntries(
      Object.entries(gameState.players).map(([id, player]) => [
        id,
        {
          id: player.id,
          name: player.name,
          character: player.character,
          location: player.location,
          isReady: player.isReady,
        },
      ])
    ),
    gameStarted: gameState.gameStarted,
    currentPlayer: gameState.currentPlayer,
    board: gameState.board,
    gamePhase: gameState.gamePhase,
  };
}

function logGameState() {
  console.log('\n[SERVER] === CURRENT GAME STATE ===');
  console.log(`Game Phase: ${gameState.gamePhase}`);
  console.log(`Players (${Object.keys(gameState.players).length}):`);

  Object.values(gameState.players).forEach((player) => {
    console.log(
      `  - ${player.name} (${player.character}) at ${player.location} ${
        player.isReady ? '[READY]' : '[NOT READY]'
      }`
    );
  });

  console.log('\nBoard State:');
  console.log('Hallways:');
  Object.entries(gameState.board.hallways).forEach(([id, hallway]) => {
    console.log(`  ${id}: ${hallway.player || 'empty'}`);
  });

  console.log('Rooms:');
  Object.entries(gameState.board.rooms).forEach(([id, room]) => {
    if (room.players.length > 0) {
      console.log(`  ${id}: [${room.players.join(', ')}]`);
    }
  });

  if (gameState.gameStarted) {
    console.log(
      `\nCurrent Turn: ${
        gameState.players[gameState.currentPlayer]?.name || 'None'
      }`
    );
  }

  console.log('================================\n');
}

// Console endpoint for debugging
app.get('/status', (req, res) => {
  res.json({
    status: 'Skeletal Increment - Architecture Demo',
    players: Object.keys(gameState.players).length,
    gameState: gameState.gamePhase,
    architecture: 'Client-Server with Socket.IO',
    dataStructures: {
      rooms: Object.keys(gameState.board.rooms).length,
      hallways: Object.keys(gameState.board.hallways).length,
    },
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log('===============================================');
  console.log('    CLUE-LESS SKELETAL INCREMENT SERVER');
  console.log('===============================================');
  console.log(`Server running on port ${PORT}`);
  console.log('Architecture: Client-Server with Socket.IO');
  console.log('Data Structures: 3x3 Grid + Hallway Nodes');
  console.log('Communication: Basic Message Passing');
  console.log('Status endpoint: http://localhost:${PORT}/status');
  console.log('===============================================\n');

  logGameState();
});
