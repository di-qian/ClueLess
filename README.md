# Clue-Less - Skeletal Increment

**Current Phase: Skeletal Increment — Architecture Demo**

A simplified web-based version of the classic Clue board game, built with React and Node.js. This implementation demonstrates the foundational architecture and core data structures for the Clue-Less game.

## 🏗️ Skeletal Increment Features

This skeletal increment focuses on establishing the foundational framework as outlined in the project plan:

### ✅ **Architecture Components Implemented:**

- **Client-Server Architecture**: Networked gameplay using Socket.IO
- **Communication Protocol**: Basic message passing between client and server
- **Core Data Structures**: Players, rooms, weapons, and grid layout
- **Board Representation**: 3×3 grid of rooms with hallway nodes
- **Turn Management**: Game state update flow between server and clients
- **Console Interface**: Text-based interaction for architecture demonstration

### 🎯 **Key Architectural Elements:**

**Data Structures:**

- 9 rooms in 3×3 grid layout
- 12 hallway nodes connecting adjacent rooms
- Player objects with location tracking
- Game state management

**Communication Protocol:**

- `joinGame`: Player registration and character selection
- `playerReady`: Ready state management
- `makeMove`: Basic movement between locations
- `gameStateUpdate`: Real-time state synchronization

**Game Flow:**

- Player registration with character assignment
- Turn-based movement system
- State synchronization across all clients
- Basic move validation

## 🚀 **Running the Skeletal Increment**

### **Prerequisites:**

Node.js (v14 or higher) must be installed.

### **Quick Start with VS Code Tasks:**

1. Open VS Code Command Palette (`Ctrl+Shift+P`)
2. Run task: "Install All Dependencies"
3. Run task: "Demo Skeletal Increment"

### **Manual Setup:**

1. Install server dependencies:

   ```bash
   cd server
   npm install
   ```

2. Install client dependencies:

   ```bash
   cd client
   npm install
   ```

3. Start skeletal server:

   ```bash
   cd server
   npm start
   ```

4. Start client:

   ```bash
   cd client
   npm start
   ```

5. Access skeletal demo at: `http://localhost:3000?mode=skeletal`

### **Architecture Demo URLs:**

- **Skeletal Console Interface**: `http://localhost:3000?mode=skeletal`
- **Full GUI Version**: `http://localhost:3000` (for comparison)
- **Server Status**: `http://localhost:3001/status`

## 🧪 **Testing the Architecture**

### **Multi-Client Testing:**

1. Open multiple browser windows/tabs
2. Navigate to `http://localhost:3000?mode=skeletal` in each
3. Join as different characters
4. Observe real-time state synchronization
5. Test turn-based movement system

### **Console Logging:**

- Server logs all message passing events
- Client displays communication log
- Real-time board state visualization
- Turn management demonstration

## 📋 **Skeletal Increment Checklist**

- ✅ Client-server architecture established
- ✅ Socket.IO communication protocol implemented
- ✅ Core data structures (players, rooms, hallways)
- ✅ 3×3 grid board representation
- ✅ Turn-taking and game state updates
- ✅ Basic console interface
- ✅ Message passing between client and server
- ✅ Multi-player connection handling
- ✅ Real-time state synchronization

## 🔄 **Next Increment: Minimal Features**

The next phase will build upon this architecture to add:

- Player registration with server character assignment
- Complete movement logic following Clue-Less rules
- Suggestion and accusation mechanics
- Enhanced server-side game logic
- Improved state synchronization

## 📁 **Project Structure**

```
├── server/
│   ├── index-skeletal.js   # Skeletal increment server
│   ├── index.js           # Full version server
│   └── package.json       # Dependencies and scripts
├── client/
│   ├── src/
│   │   ├── SkeletalApp.js  # Console-based skeletal interface
│   │   ├── App.js          # Mode switcher + full GUI
│   │   └── components/     # Full version components
│   └── package.json
└── .vscode/
    └── tasks.json          # Development tasks
```

## 🎯 **Architecture Demonstration**

This skeletal increment successfully demonstrates:

1. **Networked Architecture**: Client-server communication via Socket.IO
2. **Data Structure Design**: Proper representation of game board and players
3. **Message Protocol**: Clear communication patterns between components
4. **State Management**: Centralized game state with real-time updates
5. **Scalable Foundation**: Architecture ready for additional game features

The implementation provides a solid foundation for the subsequent increments while maintaining clean separation of concerns and demonstrating key architectural decisions.
