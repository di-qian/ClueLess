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
    this.hostId = null; // The first player to join becomes the host

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

    // Add hallways for proper Clue gameplay (based on 3x3 grid)
    // Horizontal hallways (between adjacent rooms in same row)
    // Vertical hallways (between adjacent rooms in same column)
    this.hallways = [
      // Row 1 horizontal: Study <-> Hall <-> Lounge
      'Study-Hall Hallway',
      'Hall-Lounge Hallway',
      // Row 2 horizontal: Library <-> Billiard Room <-> Dining Room
      'Library-Billiard Room Hallway',
      'Billiard Room-Dining Room Hallway',
      // Row 3 horizontal: Conservatory <-> Ballroom <-> Kitchen
      'Conservatory-Ballroom Hallway',
      'Ballroom-Kitchen Hallway',
      // Column 1 vertical: Study <-> Library <-> Conservatory
      'Study-Library Hallway',
      'Library-Conservatory Hallway',
      // Column 2 vertical: Hall <-> Billiard Room <-> Ballroom
      'Hall-Billiard Room Hallway',
      'Billiard Room-Ballroom Hallway',
      // Column 3 vertical: Lounge <-> Dining Room <-> Kitchen
      'Lounge-Dining Room Hallway',
      'Dining Room-Kitchen Hallway',
    ];

    // All possible locations (rooms + hallways)
    this.allLocations = [...this.locations, ...this.hallways];

    // Board layout as 3x3 grid with hallways
    // Layout:
    // Study    | Study-Hall     | Hall        | Hall-Lounge    | Lounge
    // Study-Lib| (not used)     | Hall-Bill   | (not used)     | Lounge-Din
    // Library  | Lib-Bill       | Billiard Rm | Bill-Conserv   | Dining Room
    // Lib-Cons | (not used)     | Ball-Cons   | (not used)     | Ball-Kit
    // Conserv  | Conserv-Ball   | Ballroom    | Ball-Kit       | Kitchen

    this.boardLayout = {
      // 3x3 grid of rooms
      rooms: [
        ['Study', 'Hall', 'Lounge'],
        ['Library', 'Billiard Room', 'Dining Room'],
        ['Conservatory', 'Ballroom', 'Kitchen'],
      ],
      // Secret passages (diagonal corners)
      secretPassages: {
        Study: 'Kitchen',
        Kitchen: 'Study',
        Lounge: 'Conservatory',
        Conservatory: 'Lounge',
      },
    };

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

    console.log('[GAME] Game ID:', this.gameId);
  }

  // Helper method to check if a location is a room (not a hallway)
  isRoom(location) {
    return this.locations.includes(location);
  }

  // Helper method to check if a location is a hallway (not a room)
  isHallway(location) {
    return this.hallways.includes(location);
  }

  // Get valid movement options from current location
  getMovementOptions(currentLocation) {
    const options = [];

    if (this.isRoom(currentLocation)) {
      // From a room, you can:
      // 1. Move to adjacent hallways
      // 2. Use secret passages (if available)

      // Find room position in 3x3 grid
      let roomRow = -1,
        roomCol = -1;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (this.boardLayout.rooms[i][j] === currentLocation) {
            roomRow = i;
            roomCol = j;
            break;
          }
        }
      }

      if (roomRow !== -1 && roomCol !== -1) {
        // Add adjacent hallways (up, down, left, right)
        const directions = [
          { dr: -1, dc: 0, name: 'up' }, // up
          { dr: 1, dc: 0, name: 'down' }, // down
          { dr: 0, dc: -1, name: 'left' }, // left
          { dr: 0, dc: 1, name: 'right' }, // right
        ];

        directions.forEach((dir) => {
          const newRow = roomRow + dir.dr;
          const newCol = roomCol + dir.dc;

          if (newRow >= 0 && newRow < 3 && newCol >= 0 && newCol < 3) {
            const adjacentRoom = this.boardLayout.rooms[newRow][newCol];
            // Create hallway name
            const hallway = `${currentLocation}-${adjacentRoom} Hallway`;
            if (this.hallways.includes(hallway)) {
              options.push(hallway);
            }
            // Also try reverse order
            const hallwayReverse = `${adjacentRoom}-${currentLocation} Hallway`;
            if (this.hallways.includes(hallwayReverse)) {
              options.push(hallwayReverse);
            }
          }
        });
      }

      // Add secret passages
      if (this.boardLayout.secretPassages[currentLocation]) {
        options.push(this.boardLayout.secretPassages[currentLocation]);
      }
    } else if (this.isHallway(currentLocation)) {
      // From a hallway, you can only move to the two connected rooms
      const parts = currentLocation.replace(' Hallway', '').split('-');
      if (parts.length === 2) {
        options.push(parts[0]);
        options.push(parts[1]);
      }
    }

    return options;
  }

  initializeCaseFile() {
    // Create the case file (one card from each category) - this is the solution
    this.caseFile = {
      character:
        this.characters[Math.floor(Math.random() * this.characters.length)],
      weapon: this.weapons[Math.floor(Math.random() * this.weapons.length)],
      room: this.locations[Math.floor(Math.random() * this.locations.length)],
    };

    console.log('\n[CASE FILE] Secret solution created:');
    console.log(`   Who: ${this.caseFile.character}`);
    console.log(`   What: ${this.caseFile.weapon}`);
    console.log(`   Where: ${this.caseFile.room}`);
  }

  dealCards() {
    // Total cards: 21 (6 characters + 6 weapons + 9 rooms)
    const totalCards =
      this.characters.length + this.weapons.length + this.locations.length;
    console.log(`\n[CARD DEALING] Total cards in game: ${totalCards}`);
    console.log(
      `[CARD DEALING] Case file (secret answer): ${this.caseFile.character}, ${this.caseFile.weapon}, ${this.caseFile.room}`
    );

    // Get all cards except those in the case file (18 cards remaining)
    const allCards = [
      ...this.characters.filter((c) => c !== this.caseFile.character),
      ...this.weapons.filter((w) => w !== this.caseFile.weapon),
      ...this.locations.filter((r) => r !== this.caseFile.room),
    ];

    console.log(
      `[CARD DEALING] Cards to distribute: ${allCards.length} (total ${totalCards} - 3 in case file)`
    );

    // Shuffle cards using Fisher-Yates algorithm
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    const players = Array.from(this.players.values());
    console.log(`[CARD DEALING] Distributing among ${players.length} players`);

    // Deal cards with some players getting one extra card (proper Clue rules)
    const cardsPerPlayer = Math.floor(allCards.length / players.length);
    const extraCards = allCards.length % players.length;

    console.log(`[CARD DEALING] Base cards per player: ${cardsPerPlayer}`);
    console.log(`[CARD DEALING] ${extraCards} players will get 1 extra card`);

    let cardIndex = 0;
    for (let i = 0; i < players.length; i++) {
      const numCards = cardsPerPlayer + (i < extraCards ? 1 : 0);
      players[i].cards = allCards.slice(cardIndex, cardIndex + numCards);
      cardIndex += numCards;

      // Organize cards by type for better display
      const characterCards = players[i].cards.filter((card) =>
        this.characters.includes(card)
      );
      const weaponCards = players[i].cards.filter((card) =>
        this.weapons.includes(card)
      );
      const roomCards = players[i].cards.filter((card) =>
        this.locations.includes(card)
      );

      console.log(
        `[CARD DEALING] ${players[i].name} (${players[i].character}) received ${players[i].cards.length} cards:`
      );
      if (characterCards.length > 0)
        console.log(`  Characters: ${characterCards.join(', ')}`);
      if (weaponCards.length > 0)
        console.log(`  Weapons: ${weaponCards.join(', ')}`);
      if (roomCards.length > 0) console.log(`  Rooms: ${roomCards.join(', ')}`);
    }

    // Verify all cards are distributed
    const totalDistributed = players.reduce(
      (sum, player) => sum + player.cards.length,
      0
    );
    console.log(
      `[CARD DEALING] Total cards distributed: ${totalDistributed} (should be ${allCards.length})`
    );
    console.log(
      `[CARD DEALING] Cards in case file: 3 (${this.caseFile.character}, ${this.caseFile.weapon}, ${this.caseFile.room})`
    );
    console.log(
      `[CARD DEALING] Total accounted for: ${
        totalDistributed + 3
      } (should be ${totalCards})`
    );

    console.log('[CARD DEALING] Complete!\n');
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

    // Assign unique starting location (ROOMS ONLY - no hallways)
    const usedLocations = Array.from(this.players.values()).map(
      (p) => p.location
    );
    const availableRooms = this.locations.filter(
      (room) => !usedLocations.includes(room)
    );
    const startLocation =
      availableRooms.length > 0
        ? availableRooms[Math.floor(Math.random() * availableRooms.length)]
        : this.locations[Math.floor(Math.random() * this.locations.length)]; // fallback if all rooms taken

    const player = {
      id: playerId,
      name: playerData.name,
      character: playerData.character,
      location: startLocation,
      isEliminated: false,
      actionsCount: 0,
      hasMoved: false, // Track if player has moved this turn (can only move once)
      cards: [], // Initialize cards array
    };

    this.players.set(playerId, player);
    this.turnOrder.push(playerId);

    // Set the first player as host
    if (!this.hostId) {
      this.hostId = playerId;
      console.log(`[GAME] ${playerData.name} is now the game host`);
    }

    console.log(
      `[DEBUG] Added player ${playerData.name}, turn order:`,
      this.turnOrder
    );
    console.log(
      `[DEBUG] Current turn before start/redeal: ${this.currentTurn}`
    );

    this.logMessage(
      `${playerData.name} joined as ${playerData.character}, starting in ${startLocation}`
    );

    // Don't auto-start - wait for host to click Start Game button
    if (this.phase === 'PLAYING') {
      // If game is already in progress, re-deal cards to include new player
      console.log(
        `[GAME] Re-dealing cards to include new player ${playerData.name}`
      );
      this.dealCards();

      // Ensure currentTurn is still valid after adding new player
      if (!this.players.has(this.currentTurn)) {
        console.log(
          `[DEBUG] Current turn ${this.currentTurn} is invalid, resetting to first player`
        );
        this.currentTurn = this.turnOrder[0];
        const newCurrentPlayer = this.players.get(this.currentTurn);
        this.logMessage(
          `Turn reset to ${newCurrentPlayer.name} (${newCurrentPlayer.character})`
        );
      }
    }

    console.log(`[DEBUG] Current turn after start/redeal: ${this.currentTurn}`);

    return { success: true, gameState: this.getPublicState() };
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      this.turnOrder = this.turnOrder.filter((id) => id !== playerId);
      this.logMessage(`${player.name} (${player.character}) left the game`);

      // If the host left, reassign host to the first remaining player
      if (this.hostId === playerId && this.players.size > 0) {
        this.hostId = this.turnOrder[0];
        const newHost = this.players.get(this.hostId);
        console.log(`[GAME] ${newHost.name} is now the new game host`);
        this.logMessage(`${newHost.name} is now the game host`);
      } else if (this.players.size === 0) {
        // No players left, reset host
        this.hostId = null;
      }

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

    // Reset hasMoved for all players at game start
    this.players.forEach((player) => {
      player.hasMoved = false;
    });

    this.logMessage(
      `Game Started! ${firstPlayer.name} (${firstPlayer.character}) goes first`
    );
    this.logMessage(
      `Available actions: Move, Make Suggestion, Make Accusation`
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
      !['GET_STATE', 'CHAT', 'START_GAME'].includes(action.type)
    ) {
      return {
        success: false,
        error: `Not your turn. Current turn: ${
          this.players.get(this.currentTurn)?.name
        }`,
      };
    }

    switch (action.type) {
      case 'START_GAME':
        return this.processStartGame(playerId);
      case 'MOVE':
        return this.processMove(playerId, action);
      case 'SUGGESTION':
        return this.processSuggestion(playerId, action);
      case 'ACCUSATION':
        return this.processAccusation(playerId, action);
      case 'END_TURN':
        return this.processEndTurn(playerId);
      case 'GET_AVAILABLE_ACTIONS':
        return this.getAvailableActions(playerId);
      default:
        return { success: false, error: 'Unknown action type: ' + action.type };
    }
  }

  processStartGame(playerId) {
    // Only the host can start the game
    if (playerId !== this.hostId) {
      return { success: false, error: 'Only the host can start the game' };
    }

    if (this.phase !== 'WAITING_FOR_PLAYERS') {
      return { success: false, error: 'Game has already started' };
    }

    if (this.players.size < 2) {
      return {
        success: false,
        error: 'Need at least 2 players to start the game',
      };
    }

    this.startGame();
    return {
      success: true,
      action: 'game_started',
      message: 'Game started successfully!',
    };
  }

  processMove(playerId, action) {
    const player = this.players.get(playerId);
    const destination = action.destination;

    // Check if player has already moved this turn
    if (player.hasMoved) {
      return {
        success: false,
        error:
          'You have already moved this turn. You can still make suggestions or accusations.',
      };
    }

    // Validate destination exists
    if (!this.allLocations.includes(destination)) {
      return { success: false, error: `Invalid location: ${destination}` };
    }

    // Validate movement is allowed from current location
    const currentLocation = player.location;
    const validMoves = this.getMovementOptions(currentLocation);

    if (!validMoves.includes(destination)) {
      return {
        success: false,
        error: `Cannot move from ${currentLocation} to ${destination}. Valid moves: ${validMoves.join(
          ', '
        )}`,
      };
    }

    const oldLocation = player.location;
    player.location = destination;
    player.actionsCount++;
    player.hasMoved = true; // Mark that player has moved this turn

    this.logMessage(
      `${player.name} moved from ${oldLocation} to ${destination}`
    );
    this.logAction(player, 'MOVE', `Moved to ${destination}`);

    return {
      success: true,
      action: 'move_completed',
      playerName: player.name,
      fromLocation: oldLocation,
      toLocation: destination,
      newMovementOptions: this.getMovementOptions(destination),
    };
  }

  processSuggestion(playerId, action) {
    const player = this.players.get(playerId);
    const { suspect, weapon } = action;
    const room = player.location;

    console.log(
      `[DEBUG SUGGESTION] Player ${player.name} trying to suggest from: ${room}`
    );
    console.log(`[DEBUG SUGGESTION] Is this a room? ${this.isRoom(room)}`);

    // CLUE RULE: Suggestions can only be made from rooms, not hallways
    if (!this.isRoom(room)) {
      console.log(`[DEBUG SUGGESTION] BLOCKED - Player is in hallway: ${room}`);
      return {
        success: false,
        error: `Cannot make suggestions from hallways. You must be in a room to make a suggestion. You are currently in: ${room}`,
      };
    }

    console.log(`[DEBUG SUGGESTION] ALLOWED - Player is in room: ${room}`);

    // Validate inputs
    if (!this.characters.includes(suspect)) {
      return { success: false, error: `Invalid suspect: ${suspect}` };
    }
    if (!this.weapons.includes(weapon)) {
      return { success: false, error: `Invalid weapon: ${weapon}` };
    }

    player.actionsCount++;

    // CLUE RULE: Move the suggested character to the suggestion room
    // Find if the suggested character is a player in the game
    let movedPlayer = null;
    for (const [otherPlayerId, otherPlayer] of this.players) {
      if (otherPlayer.character === suspect && otherPlayerId !== playerId) {
        const oldLocation = otherPlayer.location;
        otherPlayer.location = room;
        movedPlayer = otherPlayer;
        this.logMessage(
          `${suspect} moved from ${oldLocation} to ${room} due to suggestion`
        );
        break;
      }
    }

    // Create suggestion ID for tracking responses
    const suggestionId = ++this.suggestionCounter;

    this.logMessage(
      `${player.name} suggests: "${suspect} with the ${weapon} in the ${room}"`
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
      characterMoved: movedPlayer
        ? {
            character: suspect,
            playerName: movedPlayer.name,
            newLocation: room,
          }
        : null,
    };
  }

  processSuggestionResponses(suggestionId, suggestion) {
    const { suggester, suspect, weapon, room } = suggestion;
    const suggesterPlayer = this.players.get(suggester);

    // Get other players in turn order starting from next player
    // NOTE: Eliminated players can still show cards to disprove suggestions
    const otherPlayers = [];
    const suggesterIndex = this.turnOrder.indexOf(suggester);

    for (let i = 1; i < this.turnOrder.length; i++) {
      const nextIndex = (suggesterIndex + i) % this.turnOrder.length;
      const playerId = this.turnOrder[nextIndex];
      const player = this.players.get(playerId);
      // Include ALL players except the suggester - eliminated players can still show cards
      otherPlayers.push(player);
    }

    this.logMessage(
      `Checking players in turn order: ${otherPlayers
        .map((p) => p.name + (p.isEliminated ? ' (eliminated)' : ''))
        .join(', ')}`
    );

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
      this.logMessage(`✗ No one can disprove the suggestion`);
      const suggesterPlayer = this.players.get(suggestion.suggester);
      // Only continue turn message if suggester is still active
      if (!suggesterPlayer.isEliminated) {
        this.logMessage(
          `${suggesterPlayer.name}'s turn continues - they can make more actions or end their turn`
        );
      }
      this.pendingSuggestions.delete(suggestionId);
      // DON'T automatically end turn - let the suggester continue their turn
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
      this.logMessage(
        `${currentPlayer.name} has matching cards [${matchingCards.join(
          ', '
        )}] - asking to respond`
      );

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
      this.logMessage(
        `${currentPlayer.name} has no matching cards - moving to next player`
      );
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
      this.logMessage(`${player.name} shows a card to ${suggesterPlayer.name}`);

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
      // DON'T automatically end turn - let the suggester continue their turn
      // But only if the suggester is still active (not eliminated)
      if (!suggesterPlayer.isEliminated) {
        this.logMessage(
          `${suggesterPlayer.name}'s turn continues - they can make more actions or end their turn`
        );
      }
    } else if (response.action === 'cannot_disprove') {
      // Player cannot disprove, try next player
      suggestion.currentResponder++;
      this.requestSuggestionResponse(response.suggestionId);
    }
  }

  processAccusation(playerId, action) {
    const player = this.players.get(playerId);
    const { suspect, weapon, room } = action;

    console.log(
      `[DEBUG ACCUSATION] Player ${player.name} making accusation from: ${player.location}`
    );
    console.log(
      `[DEBUG ACCUSATION] ALLOWED - Accusations can be made from anywhere (rooms or hallways)`
    );

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
      `${player.name} accuses: "${suspect} with the ${weapon} in the ${room}"`
    );

    // Check against the case file
    const correct =
      suspect === this.caseFile.character &&
      weapon === this.caseFile.weapon &&
      room === this.caseFile.room;

    if (correct) {
      this.logMessage(
        `${player.name}'s accusation is CORRECT! ${player.name} wins the game!`
      );
      this.logMessage(
        `GAME WON! ${player.name} (${player.character}) is the winner!`
      );
      this.logMessage(
        `✓ The solution was indeed: ${suspect} with ${weapon} in ${room}`
      );
      this.phase = 'GAME_OVER';
      this.logAction(
        player,
        'ACCUSATION',
        `CORRECT: ${suspect} with ${weapon} in ${room} - GAME WON!`
      );

      // Broadcast winner announcement to all players
      this.communicationManager.broadcastToAll('game_won', {
        winner: player.name,
        character: player.character,
        solution: { suspect, weapon, room },
      });

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
        `✗ ${player.name}'s accusation is INCORRECT and they are eliminated!`
      );
      this.logMessage(
        `The solution was: ${this.caseFile.character} with ${this.caseFile.weapon} in ${this.caseFile.room}`
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
      availableLocations: this.allLocations,
      availableWeapons: this.weapons,
      availableCharacters: this.characters,
      currentLocation: player.location,
    };
  }

  processEndTurn(playerId) {
    const player = this.players.get(playerId);

    this.logMessage(`${player.name} ended their turn`);
    this.logAction(player, 'END_TURN', 'Player ended turn voluntarily');

    this.nextTurn();

    return {
      success: true,
      action: 'turn_ended',
      playerName: player.name,
      message: 'Turn ended successfully',
    };
  }

  nextTurn() {
    console.log(`[DEBUG] nextTurn called. Current turn: ${this.currentTurn}`);
    console.log(`[DEBUG] Turn order:`, this.turnOrder);
    console.log(`[DEBUG] Players:`, Array.from(this.players.keys()));

    if (this.turnOrder.length === 0) {
      console.log('[DEBUG] No players in turn order');
      return;
    }

    const activePlayers = this.turnOrder.filter((id) => {
      const player = this.players.get(id);
      return player && !player.isEliminated;
    });

    console.log(`[DEBUG] Active players:`, activePlayers);

    if (activePlayers.length === 0) {
      this.endGame();
      return;
    }

    // Find current player's position in the ORIGINAL turn order
    let currentOriginalIndex = this.turnOrder.indexOf(this.currentTurn);
    console.log(
      `[DEBUG] Current player index in original turn order: ${currentOriginalIndex}`
    );

    // Start looking from the next position in original turn order
    let nextPlayerId = null;
    for (let i = 1; i <= this.turnOrder.length; i++) {
      const checkIndex = (currentOriginalIndex + i) % this.turnOrder.length;
      const candidateId = this.turnOrder[checkIndex];
      const candidate = this.players.get(candidateId);

      console.log(
        `[DEBUG] Checking position ${checkIndex}, player: ${candidate?.name}, eliminated: ${candidate?.isEliminated}`
      );

      if (candidate && !candidate.isEliminated) {
        nextPlayerId = candidateId;
        break;
      }
    }

    if (!nextPlayerId) {
      console.log('[DEBUG] No active players found, ending game');
      this.endGame();
      return;
    }

    this.currentTurn = nextPlayerId;
    const currentPlayer = this.players.get(this.currentTurn);

    // Reset the hasMoved flag for the new player
    if (currentPlayer) {
      currentPlayer.hasMoved = false;
    }

    console.log(
      `[DEBUG] Next turn set to: ${this.currentTurn}, player:`,
      currentPlayer?.name
    );

    this.logMessage(
      `${currentPlayer.name}'s turn (${currentPlayer.character})`
    );
  }

  endGame() {
    this.phase = 'GAME_OVER';
    this.logMessage(
      `Game Over! All players eliminated or insufficient players remaining.`
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

  getRoomGrid() {
    // Returns a 3x3 array of objects: { room, players: [character names] }
    // Also includes hallways and players in them for full board visualization
    const grid = [];
    for (let i = 0; i < 3; i++) {
      const row = [];
      for (let j = 0; j < 3; j++) {
        const roomName = this.boardLayout.rooms[i][j];
        const playersInRoom = Array.from(this.players.values())
          .filter(p => p.location === roomName && !p.isEliminated)
          .map(p => p.character);
        // Find adjacent hallways for this room
        const hallways = [];
        const directions = [
          { dr: -1, dc: 0 }, // up
          { dr: 1, dc: 0 },  // down
          { dr: 0, dc: -1 }, // left
          { dr: 0, dc: 1 },  // right
        ];
        directions.forEach(dir => {
          const newRow = i + dir.dr;
          const newCol = j + dir.dc;
          if (newRow >= 0 && newRow < 3 && newCol >= 0 && newCol < 3) {
            const adjacentRoom = this.boardLayout.rooms[newRow][newCol];
            const hallway = `${roomName}-${adjacentRoom} Hallway`;
            const hallwayReverse = `${adjacentRoom}-${roomName} Hallway`;
            [hallway, hallwayReverse].forEach(hall => {
              if (this.hallways.includes(hall)) {
                const playersInHallway = Array.from(this.players.values())
                  .filter(p => p.location === hall && !p.isEliminated)
                  .map(p => p.character);
                hallways.push({ name: hall, players: playersInHallway });
              }
            });
          }
        });
        row.push({ room: roomName, players: playersInRoom, hallways });
      }
      grid.push(row);
    }
    // Also add any hallways not adjacent to rooms (if any)
    // (For this board, all hallways are between rooms)
    return grid;
  }

  getPublicState() {
    const currentPlayer = this.players.get(this.currentTurn);
    const hostPlayer = this.players.get(this.hostId);

    // Debug logging
    console.log(`[DEBUG] getPublicState - currentTurn: ${this.currentTurn}`);
    console.log(
      `[DEBUG] getPublicState - currentPlayer: ${currentPlayer?.name}`
    );
    console.log(`[DEBUG] getPublicState - phase: ${this.phase}`);

    return {
      gameId: this.gameId,
      phase: this.phase,
      playerCount: this.players.size,
      hostId: this.hostId,
      hostName: hostPlayer?.name,
      players: Array.from(this.players.values()).map((p) => ({
        name: p.name,
        character: p.character,
        location: p.location,
        isEliminated: p.isEliminated,
        actionsCount: p.actionsCount,
        hasMoved: p.hasMoved,
      })),
      currentTurn: this.currentTurn,
      currentPlayerName: currentPlayer?.name,
      messageLog: this.messageLog.slice(-15), // Last 15 messages
      gameActions: this.gameActions.slice(-10), // Last 10 actions
      availableElements: {
        locations: this.allLocations,
        weapons: this.weapons,
        characters: this.characters,
      },
      roomGrid: this.getRoomGrid(),
    };
  }
}

// Communication Manager
class CommunicationManager {
  constructor(io, game) {
    this.io = io;
    this.game = game;
    this.connectedClients = new Map();
    console.log('[NETWORK] Communication layer ready');
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

      // Include player's cards in the response (AFTER addPlayer completes)
      if (result.success) {
        const player = this.game.players.get(socket.id);
        result.cards = player.cards || [];

        console.log(
          `[NETWORK] ${playerData.name} should have ${
            player.cards ? player.cards.length : 0
          } cards:`,
          player.cards
        );

        // Always send updated cards to all players when someone joins
        if (this.game.phase === 'PLAYING') {
          console.log('[NETWORK] Sending cards to all players');
          this.game.players.forEach((p, playerId) => {
            const cardCount = p.cards ? p.cards.length : 0;
            console.log(`[NETWORK] Sending ${cardCount} cards to ${p.name}`);
            this.io
              .to(playerId)
              .emit('cards_updated', { cards: p.cards || [] });
          });
        }

        // Display current players in console
        console.log('\n=== CURRENT PLAYERS ===');
        this.game.players.forEach((p, id) => {
          const turnStatus =
            this.game.currentTurn === id ? '← CURRENT TURN' : '';
          console.log(
            `${p.name} (${p.character}) - Location: ${p.location} ${turnStatus}`
          );
        });
        console.log(
          `Total Players: ${this.game.players.size}/${this.game.maxPlayers}`
        );
        console.log('=======================\n');
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

        // When the game starts, send cards to all players
        if (action.type === 'START_GAME') {
          console.log('[NETWORK] Game started - sending cards to all players');
          this.game.players.forEach((p, playerId) => {
            const cardCount = p.cards ? p.cards.length : 0;
            console.log(`[NETWORK] Sending ${cardCount} cards to ${p.name}`);
            this.io
              .to(playerId)
              .emit('cards_updated', { cards: p.cards || [] });
          });
        }
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

    socket.on('get_movement_options', (data) => {
      const player = this.game.players.get(socket.id);
      if (player) {
        const options = this.game.getMovementOptions(player.location);
        socket.emit('movement_options', {
          currentLocation: player.location,
          options: options,
        });
      }
    });

    socket.on('disconnect', () => {
      const player = this.game.players.get(socket.id);
      if (player) {
        console.log(
          `[NETWORK] Player ${player.name} (${player.character}) disconnected`
        );
      } else {
        console.log('[NETWORK] Client disconnected:', socket.id);
      }

      this.game.removePlayer(socket.id);
      this.connectedClients.delete(socket.id);

      // Show updated player list
      if (this.game.players.size > 0) {
        console.log('\n=== REMAINING PLAYERS ===');
        this.game.players.forEach((p, id) => {
          const turnStatus =
            this.game.currentTurn === id ? '← CURRENT TURN' : '';
          console.log(
            `${p.name} (${p.character}) - Location: ${p.location} ${turnStatus}`
          );
        });
        console.log(
          `Total Players: ${this.game.players.size}/${this.game.maxPlayers}`
        );
        console.log('==========================\n');
      } else {
        console.log('No players remaining in game\n');
      }

      this.broadcastGameState();
    });
  }

  broadcastGameState() {
    const gameState = this.game.getPublicState();
    this.io.emit('game_state_update', gameState);
  }

  sendToClient(playerId, event, data) {
    this.io.to(playerId).emit(event, data);
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }
}

// Initialize system
const game = new MinimalGame();
const commManager = new CommunicationManager(io, game);
game.communicationManager = commManager;

io.on('connection', (socket) => {
  commManager.handleConnection(socket);
});

// Serve the HTML client
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/minimal-client.html');
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
  console.log(`Server running on port ${PORT}`);
});
