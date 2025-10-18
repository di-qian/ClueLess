# Clue-Less Skeletal Increment - Demo

## Quick Setup

### **1. Install Dependencies**

```bash
# Copy the demo package.json
cp demo-package.json package.json

# Install dependencies
npm install
```

### **2. Run Demo Server**

```bash
node skeletal-server.js
```

### **3. Open Demo Client**

Open `skeletal-client.html` in multiple browser tabs to test multi-client messaging.

## Demo Features

### **Subsystem Communication**

- ✅ Real-time Socket.IO messaging
- ✅ REST API endpoints
- ✅ Multi-client synchronization
- ✅ Error handling and validation

### **Message Types Demonstrated**

- `join_game` → `game_joined`
- `game_action` → `action_processed`
- `get_game_state` → `game_state_update`
- Player join/leave broadcasts

### **API Endpoints**

- `GET /api/demo/status` - System and subsystem status
- `GET /api/demo/messages` - Message log
- `POST /api/demo/simulate-action` - Simulate inter-subsystem communication

## Demo Flow

1. **Architecture Overview** - Explain Server/Client/Network tiers
2. **System Initialization** - Show architecture component startup
3. **Client Connection** - Demonstrate Socket.IO connection
4. **Player Join Messaging** - Show join game messaging flow
5. **Multi-Client Messaging** - Real-time broadcasts
6. **Game Actions** - Action processing flow
7. **System Status** - REST API demonstration
8. **Error Handling** - Robustness testing

**For detailed presentation script and team roles, see `DEMO-SCRIPT.md`**
