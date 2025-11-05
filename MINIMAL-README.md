# Clue-Less Minimal Increment - Core Functionality Demo

## Quick Setup & Demo

### **1. Install Dependencies**

```bash
# Copy the demo package.json if not already done
cp demo-package.json package.json

# Install dependencies
npm install
```

### **2. Run Core Functionality Server**

```bash
node minimal-server-simple.js
```

### **3. Open Game Clients**

Open `minimal-client-simple.html` in multiple browser tabs (2-6 players) to test core functionality.

## Minimal Increment Philosophy

This minimal increment focuses on **validating core game functionality** from our design document rather than visual elements. The game board visualization is intentionally reserved for the Target increment phase.

### **Core Functionality Demonstrated**

- ✅ **Player Management** - Join game, character selection, elimination tracking
- ✅ **Game State Management** - Turn progression, game phase transitions
- ✅ **Movement System** - Location tracking and basic validation
- ✅ **Suggestion Processing** - Multi-player interaction mechanics
- ✅ **Accusation Handling** - Player elimination logic
- ✅ **Real-time Synchronization** - All players see consistent game state
- ✅ **Error Handling** - Invalid action prevention and user feedback

### **Design Document Classes Implemented**

- **Game Class** - Turn management, state coordination, rule enforcement
- **Player Class** - Character management, location tracking, action processing
- **Communication Layer** - Real-time Socket.IO messaging and state broadcast
- **Action Processing** - Movement, suggestion, and accusation validation

## How to Play (Core Functionality Demo)

1. **Join Game**: Enter name and select character (6 characters available)
2. **Game Start**: Automatic start when 2+ players join
3. **Take Actions**: When it's your turn:
   - **Move**: Select destination from available locations
   - **Suggest**: Choose suspect and weapon for suggestion
   - **Accuse**: Make final accusation (eliminates if wrong)
4. **Monitor Activity**: Watch game log for real-time activity and state changes

## Interface Overview

- **Left Panel**: Game controls and player management
- **Right Panel**: Activity log showing all game events and state changes
- **Focus**: Functionality validation through detailed logging rather than visual board

## Available Game Elements

**Characters**: Miss Scarlet, Colonel Mustard, Mrs. White, Mr. Green, Mrs. Peacock, Professor Plum

**Locations**: Study, Hall, Lounge, Library, Billiard Room, Conservatory, Ballroom, Kitchen, Dining Room

**Weapons**: Knife, Candlestick, Revolver, Rope, Lead Pipe, Wrench

## API Endpoints

- `GET /api/game/status` - System status and capabilities overview
- `GET /api/game/actions` - Game action history and message logs

## Demo Script

For presentation guidelines and team roles, see `MINIMAL-DEMO-SCRIPT-SIMPLE.md`.

## Strategic Approach

**Minimal Increment Focus:**

- Validate all core game mechanics from design document
- Prove three-tier architecture works under real gameplay
- Establish solid foundation for visual enhancements

**Target Increment Goals:**

- Add visual 3x3 game board representation
- Implement complete Clue-Less movement rules
- Enhanced UI with drag-and-drop functionality
- Complete card dealing and win condition systems

## Architecture Notes

This minimal increment implements:

- **Server Layer**: Core game logic, turn management, rule enforcement
- **Network Layer**: Real-time Socket.IO communication and state broadcast
- **Client Layer**: Functional interface focused on mechanics validation

**Design Philosophy**: Prove the game works before making it pretty.

---

**DevDynasty Team**: Scott Arneson, Di Qian, Saniyah Rahman, Aaron Elkin
