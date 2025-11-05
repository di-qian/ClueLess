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

// Minimal Game Logic - Core Functionality Demo (No Visual Board)
class MinimalGame {
  constructor() {
    this.gameId = 'MINIMAL-' + Math.random().toString(36).substr(2, 9);
    this.phase = 'WAITING_FOR_PLAYERS';
    this.players = new Map();
    this.currentTurn = null;
    this.turnOrder = [];
    this.messageLog = [];
    this.maxPlayers = 6;
    this.gameActions = [];
    this.pendingSuggestions = new Map();
    this.suggestionCounter = 0;
    this.caseFile = null;

    // Game elements for demonstration
    this.locations = [
      'Study',
      'Hall',
      'Lounge',
      'Library',
      'Billiard Room',
      'Conservatory',
      'Ballroom',
      'Kitchen',
      'Dining Room',
    ];

    this.weapons = [
      'Knife',
      'Candlestick',
      'Revolver',
      'Rope',
      'Lead Pipe',
      'Wrench',
    ];

    this.characters = [
      'Miss Scarlet',
      'Colonel Mustard',
      'Mrs. White',
      'Mr. Green',
      'Mrs. Peacock',
      'Professor Plum',
    ];

    this.initializeCaseFile();

    console.log('[MINIMAL GAME] Core functionality demo initialized');
    console.log('[GAME] Game ID:', this.gameId);
  }

  initializeCaseFile() {
    // Create the case file (one card from each category)
    this.caseFile = {
      character:
        this.characters[Math.floor(Math.random() * this.characters.length)],
      weapon: this.weapons[Math.floor(Math.random() * this.weapons.length)],
      room: this.locations[Math.floor(Math.random() * this.locations.length)],
    };

    console.log('[GAME] Case file created:', this.caseFile);
  }

  dealCards() {
    const allCards = [
      ...this.characters.filter((c) => c !== this.caseFile.character),
      ...this.weapons.filter((w) => w !== this.caseFile.weapon),
      ...this.locations.filter((r) => r !== this.caseFile.room),
    ];

    // Shuffle cards
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    const players = Array.from(this.players.values());
    const cardsPerPlayer = Math.floor(allCards.length / players.length);

    for (let i = 0; i < players.length; i++) {
      const startIndex = i * cardsPerPlayer;
      const endIndex = startIndex + cardsPerPlayer;
      players[i].cards = allCards.slice(startIndex, endIndex);
      console.log(
        `[GAME] ${players[i].name} received ${players[i].cards.length} cards:`,
        players[i].cards
      );
    }
  }

  addPlayer(playerId, playerData) {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, error: 'Game is full (max 6 players)' };
    }

    // Check if character is already taken
    for (const [id, player] of this.players) {
      if (player.character === playerData.character) {
        return {
          success: false,
          error: `${playerData.character} is already taken`,
        };
      }
    }

    // Assign random starting location for demo
    const startLocation =
      this.locations[Math.floor(Math.random() * this.locations.length)];

    const player = {
      id: playerId,
      name: playerData.name,
      character: playerData.character,
      location: startLocation,
      isEliminated: false,
      actionsCount: 0,
    };

    this.players.set(playerId, player);
    this.turnOrder.push(playerId);

    this.logMessage(
      `🎭 ${playerData.name} joined as ${playerData.character}, starting in ${startLocation}`
    );

    // Start game if we have minimum players
    if (this.players.size >= 2 && this.phase === 'WAITING_FOR_PLAYERS') {
      this.startGame();
    }

    return { success: true, gameState: this.getPublicState() };
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      this.turnOrder = this.turnOrder.filter((id) => id !== playerId);
      this.logMessage(`👋 ${player.name} (${player.character}) left the game`);

      if (this.currentTurn === playerId && this.turnOrder.length > 0) {
        this.nextTurn();
      }
    }
  }

  startGame() {
    this.dealCards(); // Deal cards before starting
    this.phase = 'PLAYING';
    this.currentTurn = this.turnOrder[0];
    const firstPlayer = this.players.get(this.currentTurn);
    this.logMessage(
      `🎮 Game Started! ${firstPlayer.name} (${firstPlayer.character}) goes first`
    );
    this.logMessage(
      `📋 Available actions: Move, Make Suggestion, Make Accusation`
    );
  }

  processGameAction(playerId, action) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (player.isEliminated) {
      return { success: false, error: 'You have been eliminated' };
    }

    // Basic turn validation (allow some actions from any player for demo)
    if (
      this.currentTurn !== playerId &&
      !['GET_STATE', 'CHAT'].includes(action.type)
    ) {
      return {
        success: false,
        error: `Not your turn. Current turn: ${
          this.players.get(this.currentTurn)?.name
        }`,
      };
    }

    switch (action.type) {
      case 'MOVE':
        return this.processMove(playerId, action);
      case 'SUGGESTION':
        return this.processSuggestion(playerId, action);
      case 'ACCUSATION':
        return this.processAccusation(playerId, action);
      case 'GET_AVAILABLE_ACTIONS':
        return this.getAvailableActions(playerId);
      default:
        return { success: false, error: 'Unknown action type: ' + action.type };
    }
  }

  processMove(playerId, action) {
    const player = this.players.get(playerId);
    const destination = action.destination;

    // Simple validation - check if destination exists
    if (!this.locations.includes(destination)) {
      return { success: false, error: `Invalid location: ${destination}` };
    }

    const oldLocation = player.location;
    player.location = destination;
    player.actionsCount++;

    this.logMessage(
      `🚶 ${player.name} moved from ${oldLocation} to ${destination}`
    );
    this.logAction(player, 'MOVE', `Moved to ${destination}`);

    this.nextTurn();

    return {
      success: true,
      action: 'move_completed',
      playerName: player.name,
      fromLocation: oldLocation,
      toLocation: destination,
    };
  }

  processSuggestion(playerId, action) {
    const player = this.players.get(playerId);
    const { suspect, weapon } = action;
    const room = player.location;

    // Validate inputs
    if (!this.characters.includes(suspect)) {
      return { success: false, error: `Invalid suspect: ${suspect}` };
    }
    if (!this.weapons.includes(weapon)) {
      return { success: false, error: `Invalid weapon: ${weapon}` };
    }

    player.actionsCount++;

    // Create suggestion ID for tracking responses
    const suggestionId = ++this.suggestionCounter;

    this.logMessage(
      `💭 ${player.name} suggests: "${suspect} with the ${weapon} in the ${room}"`
    );

    // Start suggestion resolution process
    this.processSuggestionResponses(suggestionId, {
      suggester: playerId,
      suspect,
      weapon,
      room,
    });

    this.logAction(
      player,
      'SUGGESTION',
      `${suspect} with ${weapon} in ${room}`
    );

    return {
      success: true,
      action: 'suggestion_made',
      playerName: player.name,
      suspect: suspect,
      weapon: weapon,
      room: room,
    };
  }

  processSuggestionResponses(suggestionId, suggestion) {
    const { suggester, suspect, weapon, room } = suggestion;
    const suggesterPlayer = this.players.get(suggester);

    // Get other players in turn order starting from next player
    const otherPlayers = [];
    const suggesterIndex = this.turnOrder.indexOf(suggester);

    for (let i = 1; i < this.turnOrder.length; i++) {
      const nextIndex = (suggesterIndex + i) % this.turnOrder.length;
      const playerId = this.turnOrder[nextIndex];
      const player = this.players.get(playerId);
      if (!player.isEliminated) {
        otherPlayers.push(player);
      }
    }

    // Store suggestion for tracking
    this.pendingSuggestions.set(suggestionId, {
      ...suggestion,
      remainingPlayers: otherPlayers.map((p) => p.id),
      currentResponder: 0,
    });

    this.requestSuggestionResponse(suggestionId);
  }

  requestSuggestionResponse(suggestionId) {
    const suggestion = this.pendingSuggestions.get(suggestionId);
    if (
      !suggestion ||
      suggestion.currentResponder >= suggestion.remainingPlayers.length
    ) {
      // No one could disprove
      this.logMessage(`❌ No one can disprove the suggestion`);
      this.pendingSuggestions.delete(suggestionId);
      this.nextTurn();
      return;
    }

    const currentPlayerId =
      suggestion.remainingPlayers[suggestion.currentResponder];
    const currentPlayer = this.players.get(currentPlayerId);

    // Check if player has any matching cards
    const matchingCards = currentPlayer.cards.filter(
      (card) =>
        card === suggestion.suspect ||
        card === suggestion.weapon ||
        card === suggestion.room
    );

    if (matchingCards.length > 0) {
      // Send suggestion request to this player
      const suggesterPlayer = this.players.get(suggestion.suggester);
      this.communicationManager.sendToClient(
        currentPlayerId,
        'suggestion_request',
        {
          id: suggestionId,
          playerName: suggesterPlayer.name,
          suspect: suggestion.suspect,
          weapon: suggestion.weapon,
          room: suggestion.room,
        }
      );
    } else {
      // Player cannot disprove, move to next
      suggestion.currentResponder++;
      this.requestSuggestionResponse(suggestionId);
    }
  }

  handleSuggestionResponse(playerId, response) {
    const suggestion = this.pendingSuggestions.get(response.suggestionId);
    if (!suggestion) return;

    const player = this.players.get(playerId);
    const suggesterPlayer = this.players.get(suggestion.suggester);

    if (response.action === 'show_card') {
      // Player shows a card
      this.logMessage(
        `🎴 ${player.name} shows a card to ${suggesterPlayer.name}`
      );

      // Send the card privately to the suggester
      this.communicationManager.sendToClient(
        suggestion.suggester,
        'card_shown',
        {
          responderName: player.name,
          card: response.card,
          targetPlayer: suggesterPlayer.name,
        }
      );

      this.communicationManager.broadcastToAll('action_result', {
        action: 'suggestion_disproved',
        responderName: player.name,
        suggesterName: suggesterPlayer.name,
      });

      this.pendingSuggestions.delete(response.suggestionId);
      this.nextTurn();
    } else if (response.action === 'cannot_disprove') {
      // Player cannot disprove, try next player
      suggestion.currentResponder++;
      this.requestSuggestionResponse(response.suggestionId);
    }
  }

  processAccusation(playerId, action) {
    const player = this.players.get(playerId);
    const { suspect, weapon, room } = action;

    // Validate inputs
    if (
      !this.characters.includes(suspect) ||
      !this.weapons.includes(weapon) ||
      !this.locations.includes(room)
    ) {
      return { success: false, error: 'Invalid accusation parameters' };
    }

    player.actionsCount++;

    this.logMessage(
      `⚖️ ${player.name} accuses: "${suspect} with the ${weapon} in the ${room}"`
    );

    // Check against the case file
    const correct =
      suspect === this.caseFile.character &&
      weapon === this.caseFile.weapon &&
      room === this.caseFile.room;

    if (correct) {
      this.logMessage(
        `🎉 ${player.name}'s accusation is CORRECT! ${player.name} wins the game!`
      );
      this.phase = 'GAME_OVER';
      this.logAction(
        player,
        'ACCUSATION',
        `CORRECT: ${suspect} with ${weapon} in ${room} - GAME WON!`
      );
      return {
        success: true,
        action: 'accusation_correct',
        playerName: player.name,
        suspect,
        weapon,
        room,
        winner: player.name,
      };
    } else {
      this.logMessage(
        `❌ ${player.name}'s accusation is INCORRECT and they are eliminated!`
      );
      this.logMessage(
        `💡 The solution was: ${this.caseFile.character} with ${this.caseFile.weapon} in ${this.caseFile.room}`
      );

      player.isEliminated = true;
      this.logAction(
        player,
        'ACCUSATION',
        `FAILED: ${suspect} with ${weapon} in ${room}`
      );

      // Check if game should end
      const activePlayers = Array.from(this.players.values()).filter(
        (p) => !p.isEliminated
      );
      if (activePlayers.length <= 1) {
        this.endGame();
      } else {
        this.nextTurn();
      }

      return {
        success: true,
        action: 'accusation_failed',
        playerName: player.name,
        suspect,
        weapon,
        room,
      };
    }
  }

  getAvailableActions(playerId) {
    const player = this.players.get(playerId);
    if (!player || player.isEliminated) {
      return { success: false, error: 'Player not available' };
    }

    return {
      success: true,
      availableLocations: this.locations,
      availableWeapons: this.weapons,
      availableCharacters: this.characters,
      currentLocation: player.location,
    };
  }

  nextTurn() {
    if (this.turnOrder.length === 0) return;

    const activePlayers = this.turnOrder.filter((id) => {
      const player = this.players.get(id);
      return player && !player.isEliminated;
    });

    if (activePlayers.length === 0) {
      this.endGame();
      return;
    }

    let currentIndex = activePlayers.indexOf(this.currentTurn);
    let nextIndex = (currentIndex + 1) % activePlayers.length;

    this.currentTurn = activePlayers[nextIndex];
    const currentPlayer = this.players.get(this.currentTurn);

    this.logMessage(
      `🎯 ${currentPlayer.name}'s turn (${currentPlayer.character})`
    );
  }

  endGame() {
    this.phase = 'GAME_OVER';
    this.logMessage(
      `🏁 Game Over! All players eliminated or insufficient players remaining.`
    );
  }

  logMessage(message) {
    const timestamp = new Date().toLocaleTimeString();
    this.messageLog.push({ timestamp, message });
    console.log(`[GAME] ${timestamp}: ${message}`);
  }

  logAction(player, actionType, details) {
    this.gameActions.push({
      timestamp: new Date().toISOString(),
      player: player.name,
      character: player.character,
      action: actionType,
      details: details,
    });
  }

  getPublicState() {
    return {
      gameId: this.gameId,
      phase: this.phase,
      playerCount: this.players.size,
      players: Array.from(this.players.values()).map((p) => ({
        name: p.name,
        character: p.character,
        location: p.location,
        isEliminated: p.isEliminated,
        actionsCount: p.actionsCount,
      })),
      currentTurn: this.currentTurn,
      currentPlayerName: this.players.get(this.currentTurn)?.name,
      messageLog: this.messageLog.slice(-15), // Last 15 messages
      gameActions: this.gameActions.slice(-10), // Last 10 actions
      availableElements: {
        locations: this.locations,
        weapons: this.weapons,
        characters: this.characters,
      },
    };
  }
}

// Communication Manager
class CommunicationManager {
  constructor(io, game) {
    this.io = io;
    this.game = game;
    this.connectedClients = new Map();
    console.log('[NETWORK] Communication layer ready for minimal demo');
  }

  handleConnection(socket) {
    console.log('[NETWORK] Client connected:', socket.id);
    this.connectedClients.set(socket.id, {
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
    });

    socket.on('join_game', (playerData) => {
      console.log('[NETWORK] Player joining:', playerData);
      const result = this.game.addPlayer(socket.id, playerData);

      // Include player's cards in the response
      if (result.success) {
        const player = this.game.players.get(socket.id);
        result.cards = player.cards || [];
      }

      socket.emit('game_joined', result);

      if (result.success) {
        this.broadcastGameState();
        this.io.emit('player_joined', {
          player: this.game.players.get(socket.id),
        });
      }
    });

    socket.on('game_action', (action) => {
      console.log('[NETWORK] Game action:', action.type, 'from', socket.id);
      const result = this.game.processGameAction(socket.id, action);

      if (result.success) {
        this.io.emit('action_result', result);
        this.broadcastGameState();
      } else {
        socket.emit('action_error', result);
      }
    });

    socket.on('suggestion_response', (response) => {
      console.log('[NETWORK] Suggestion response:', response);
      this.game.handleSuggestionResponse(socket.id, response);
    });

    socket.on('get_game_state', () => {
      socket.emit('game_state_update', this.game.getPublicState());
    });

    socket.on('disconnect', () => {
      console.log('[NETWORK] Client disconnected:', socket.id);
      this.game.removePlayer(socket.id);
      this.connectedClients.delete(socket.id);
      this.broadcastGameState();
    });
  }

  broadcastGameState() {
    const gameState = this.game.getPublicState();
    this.io.emit('game_state_update', gameState);
  }
}

// Initialize system
const game = new MinimalGame();
const commManager = new CommunicationManager(io, game);
game.communicationManager = commManager;

io.on('connection', (socket) => {
  commManager.handleConnection(socket);
});

// REST API endpoints
app.get('/api/game/status', (req, res) => {
  res.json({
    system: 'Clue-Less Minimal Increment - Core Functionality Demo',
    architecture: {
      server: 'ACTIVE - Game logic and rule enforcement',
      network: 'ACTIVE - Real-time Socket.IO communication',
      client: 'READY - Text-based interface',
    },
    gameState: game.getPublicState(),
    connectedClients: commManager.connectedClients.size,
    capabilities: [
      'Player joining and character selection',
      'Turn-based game management',
      'Character movement with location tracking',
      'Suggestion mechanics with validation',
      'Accusation handling with elimination',
      'Real-time game state synchronization',
      'Game action logging and history',
    ],
  });
});

app.get('/api/game/actions', (req, res) => {
  res.json({
    recentActions: game.gameActions,
    messageLog: game.messageLog,
    totalActions: game.gameActions.length,
  });
});

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log('=====================================');
  console.log('   CLUE-LESS MINIMAL INCREMENT');
  console.log('   Core Functionality Demo');
  console.log('=====================================');
  console.log(`Server running on port ${PORT}`);
  console.log('');
  console.log('Minimal increment features:');
  console.log('   ✓ Player management and character selection');
  console.log('   ✓ Turn-based game flow');
  console.log('   ✓ Movement mechanics');
  console.log('   ✓ Suggestion processing');
  console.log('   ✓ Accusation handling');
  console.log('   ✓ Real-time state synchronization');
  console.log('   ✓ Game action logging');
  console.log('');
  console.log('Focus: Core game logic demonstration');
  console.log('Note: Visual board reserved for target increment');
  console.log('=====================================');
});
