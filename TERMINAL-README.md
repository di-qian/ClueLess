# Clue-Less Terminal Client Demo

This project demonstrates client-server communication for the Clue-Less game using only the terminal (no GUI). The terminal client connects to the Socket.IO server and allows you to join the game, send actions, and view game state directly from your command line.

## Prerequisites
- Node.js (v14+ recommended)
- npm

## Setup
1. **Install dependencies** (from the project root):
   ```sh
   npm install
   ```

2. **Start the server** (in one terminal):
   ```sh
   npm start
   ```
   This runs `skeletal-server.js` on port 3001 by default.

3. **Run the terminal client** (in a new terminal window/tab):
   ```sh
   npm run terminal-client
   ```
   You can run this command in multiple terminals to simulate multiple players.

   > If your server is running on a different host/port, set the `SERVER_URL` environment variable:
   > ```sh
   > SERVER_URL=http://localhost:3001 npm run terminal-client
   > ```

## Terminal Client Commands
- `help` — Show available commands
- `join` — Join the game (interactive character selection; you cannot join with a character that is already taken)
- `action <type> [payloadJSON]` — Send a game action (e.g. `action SUGGEST '{"suspect":"Professor Plum","room":"Kitchen"}'`)
- `state` — Request the current game state
- `listchars` — List available characters (fetches from the server)
- `exit` — Exit the client

## Example Session
```
cmd> join
Available characters:
  [1] Miss Scarlet
  [2] Colonel Mustard
  [3] Mrs. White
  [4] Mr. Green
  [5] Mrs. Peacock
  [6] Professor Plum
Enter your name: Alice
Pick a character (number or name): 1
[CLIENT] Sending join_game -> { name: 'Alice', character: 'Miss Scarlet' }

cmd> state
cmd> action SUGGEST '{"suspect":"Professor Plum","room":"Kitchen"}'
cmd> listchars
cmd> exit
```

## Notes
- Each terminal client is a separate player. Open multiple terminals to simulate multiplayer.
- Once a character is chosen, it cannot be chosen again for the session, even if a player disconnects.
- The client prints all server events and state updates in real time.
- The server and client communicate using Socket.IO events (no web browser required).
- For available characters, use `listchars` before joining or use the interactive join command.

## Troubleshooting
- If you see connection errors, ensure the server is running and accessible at the correct URL/port.
- If you change the server port, update the `SERVER_URL` variable when running the client.

---
For more details on the architecture, see `README.md` and `DEMO-README.md`.
