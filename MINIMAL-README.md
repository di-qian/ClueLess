# Clue-Less Minimal Increment - Core Functionality Demo

## Quick Setup & Demo

### **1. Install Dependencies**

```bash
# Dependencies should already be installed from the main project
# If needed, install dependencies
npm install
```

### **2. Run Core Functionality Server**

```bash
node minimal-server.js
```

### **3. Open Game Clients**

Open `minimal-client.html` in multiple browser tabs (2-6 players) to test core functionality.

## Minimal Increment Philosophy

This minimal increment focuses on **validating core game functionality** from our design document rather than visual elements. The game board visualization is intentionally reserved for the Target increment phase.

### **Core Functionality Demonstrated**

- ✅ **Player Management** - Join game, character selection, card dealing, elimination tracking
- ✅ **Game State Management** - Turn progression, game phase transitions
- ✅ **Movement System** - Location tracking and validation
- ✅ **Suggestion Processing** - Complete turn-based card showing mechanics with proper ClueLess rules
- ✅ **Accusation Handling** - Win/lose logic with case file validation
- ✅ **Card System** - Proper card dealing, case file generation, and private card showing
- ✅ **Real-time Synchronization** - All players see consistent game state
- ✅ **Error Handling** - Invalid action prevention and user feedback

### **Design Document Classes Implemented**

- **Game Class** - Turn management, state coordination, rule enforcement
- **Player Class** - Character management, location tracking, action processing
- **Communication Layer** - Real-time Socket.IO messaging and state broadcast
- **Action Processing** - Movement, suggestion, and accusation validation

## How to Play (Complete ClueLess Demo)

1. **Join Game**: Enter name and select character (6 characters available)
2. **Receive Cards**: Each player automatically receives cards when game starts
3. **Game Start**: Automatic start when 2+ players join
4. **Take Actions**: When it's your turn:
   - **Move**: Select destination from available locations
   - **Suggest**: Choose suspect and weapon for suggestion (room is automatic based on your location)
   - **Accuse**: Make final accusation with suspect, weapon, and room (wins if correct, eliminates if wrong)
5. **Respond to Suggestions**: When other players make suggestions:
   - **Show Card**: If you have a matching card, you must show it privately
   - **Cannot Disprove**: If you have no matching cards, declare you cannot disprove
6. **Monitor Activity**: Watch game log for real-time activity and state changes
7. **View Your Cards**: Check the "Your Cards" section to see what you can use to disprove suggestions

## Interface Overview

- **Left Panel**: Game controls, player actions, and suggestion response interface
- **Center Panel**: Comprehensive activity log showing all game events, moves, suggestions, and card interactions
- **Right Panel**: Player list and your personal cards display
- **Responsive Design**: Wider layout for better readability with larger fonts
- **Focus**: Complete playable ClueLess experience with proper game mechanics

## Available Game Elements

**Characters**: Miss Scarlet, Colonel Mustard, Mrs. White, Mr. Green, Mrs. Peacock, Professor Plum

**Locations**: Study, Hall, Lounge, Library, Billiard Room, Conservatory, Ballroom, Kitchen, Dining Room

**Weapons**: Knife, Candlestick, Revolver, Rope, Lead Pipe, Wrench

## API Endpoints

- `GET /api/game/status` - System status and capabilities overview
- `GET /api/game/actions` - Game action history and message logs

## Demo Script

For presentation guidelines and team roles, see `MINIMAL-DEMO-SCRIPT.md`.

## Strategic Approach

**Minimal Increment Focus:**

- ✅ **Complete ClueLess game mechanics** - Full card dealing, suggestion responses, win conditions
- ✅ **Authentic ClueLess rules** - Following official game rules for suggestions and accusations
- ✅ **Three-tier architecture validation** - Proven under complete gameplay scenarios
- ✅ **Multiplayer interaction** - Real-time card showing and turn-based responses
- ✅ **Solid foundation** - Ready for visual board enhancement in Target increment

**Target Increment Goals:**

- Add visual 3x3 game board with hallway representation
- Implement complete ClueLess movement rules with hallway restrictions
- Enhanced UI with character piece visualization and board interaction
- Secret passage mechanics and advanced movement options

## Architecture Notes

This minimal increment implements:

- **Server Layer**: Core game logic, turn management, rule enforcement
- **Network Layer**: Real-time Socket.IO communication and state broadcast
- **Client Layer**: Functional interface focused on mechanics validation

**Design Philosophy**: Implement complete game mechanics first, then enhance with visual board representation.

---

**DevDynasty Team**: Scott Arneson, Di Qian, Saniyah Rahman, Aaron Elkin
