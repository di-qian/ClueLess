// Terminal client for Clue-Less demo
// Connects to the Socket.IO server and provides a simple CLI to demo messages

const io = require('socket.io-client');
const readline = require('readline');
const http = require('http');
const { URL } = require('url');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

const socket = io(SERVER_URL, { transports: ['websocket'] });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'cmd> ',
});

let localPlayer = null;

function log(...args) {
  console.log(...args);
}

function showHelp() {
  log('\nCommands:');
  log('  help                     Show this help');
  log('  join                     Join the game (interactive character selection)');
  log('  action <type> [payload]  Send a game action (payload JSON optional)');
  log('  state                    Request current game state');
  log('  listchars                List available characters (via /api/demo/status)');
  log('  exit                     Exit the client\n');
}

function fetchStatus() {
  const url = new URL('/api/demo/status', SERVER_URL);
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function interactiveJoin() {
  try {
    const status = await fetchStatus();
    const chars = status.availableCharacters;
    if (!chars || chars.length === 0) {
      log('No available characters left.');
      rl.prompt();
      return;
    }
    log('\nAvailable characters:');
    chars.forEach((c, i) => log(`  [${i + 1}] ${c}`));
    rl.question('Enter your name: ', (name) => {
      if (!name.trim()) {
        log('Name required.');
        rl.prompt();
        return;
      }
      rl.question('Pick a character (number or name): ', (pick) => {
        let character = pick;
        if (/^\d+$/.test(pick)) {
          const idx = parseInt(pick, 10) - 1;
          if (idx >= 0 && idx < chars.length) character = chars[idx];
        }
        if (!chars.includes(character)) {
          log('Invalid character selection.');
          rl.prompt();
          return;
        }
        const payload = { name, character };
        log(`[CLIENT] Sending join_game ->`, payload);
        socket.emit('join_game', payload);
      });
    });
  } catch (e) {
    log('Failed to fetch available characters:', e.message || e);
    rl.prompt();
  }
}

socket.on('connect', () => {
  log('\n[CLIENT] Connected to server', socket.id);
  rl.prompt();
});

socket.on('disconnect', (reason) => {
  log('\n[CLIENT] Disconnected:', reason);
});

socket.on('game_joined', (result) => {
  if (!result.success) {
    log(`\n[ERROR] Could not join: ${result.error}`);
    rl.prompt();
    return;
  }
  log('\n[EVENT] game_joined ->', JSON.stringify(result, null, 2));
  if (result && result.gameState && result.gameState.players) {
    const me = result.gameState.players.find((p) => p.id === socket.id);
    if (me) localPlayer = me;
  }
  rl.prompt();
});

socket.on('player_joined', (payload) => {
  log('\n[EVENT] player_joined ->', JSON.stringify(payload, null, 2));
  rl.prompt();
});

socket.on('player_left', (payload) => {
  log('\n[EVENT] player_left ->', JSON.stringify(payload, null, 2));
  rl.prompt();
});

socket.on('game_state_update', (state) => {
  log('\n[EVENT] game_state_update ->');
  console.log(JSON.stringify(state, null, 2));
  rl.prompt();
});

socket.on('action_processed', (payload) => {
  log('\n[EVENT] action_processed ->', JSON.stringify(payload, null, 2));
  rl.prompt();
});

// CLI command handling
rl.on('line', async (line) => {
  const raw = line.trim();
  if (!raw) {
    rl.prompt();
    return;
  }

  const [cmd, ...rest] = raw.split(' ');

  if (cmd === 'help') {
    showHelp();
  } else if (cmd === 'join') {
    await interactiveJoin();
    return; // Don't prompt again until join flow completes
  } else if (cmd === 'action') {
    const type = rest[0];
    const payloadText = rest.slice(1).join(' ');
    if (!type) {
      log('Usage: action <type> [payloadJSON]');
    } else {
      let payload = { type };
      if (payloadText) {
        try {
          const parsed = JSON.parse(payloadText);
          payload = Object.assign(payload, parsed);
        } catch (e) {
          log('Failed to parse payload JSON, sending as raw text');
          payload.data = payloadText;
        }
      }
      log('[CLIENT] Sending game_action ->', payload);
      socket.emit('game_action', payload);
    }
  } else if (cmd === 'state') {
    log('[CLIENT] Requesting game state');
    socket.emit('get_game_state');
  } else if (cmd === 'listchars') {
    try {
      const status = await fetchStatus();
      log('\n[API] /api/demo/status ->');
      console.log(JSON.stringify(status.availableCharacters || status, null, 2));
    } catch (e) {
      log('Failed to fetch status from server:', e.message || e);
    }
  } else if (cmd === 'exit') {
    log('[CLIENT] Exiting...');
    socket.close();
    rl.close();
    process.exit(0);
  } else {
    log('Unknown command. Type "help" for list of commands.');
  }

  rl.prompt();
});

rl.on('close', () => {
  log('\n[CLIENT] CLI closed');
  process.exit(0);
});

// Print help at start
showHelp();
rl.prompt();
