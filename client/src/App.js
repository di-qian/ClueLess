import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [logs, setLogs] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState('');

  // Suggestion and Accusation forms - removed unused show state variables
  const [suggestionData, setSuggestionData] = useState({
    character: '',
    weapon: '',
  });
  const [accusationData, setAccusationData] = useState({
    character: '',
    weapon: '',
    room: '',
  });

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

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    // Socket event listeners for skeletal increment
    socket.on('gameJoined', (data) => {
      setPlayerId(data.playerId);
      setGameState(data.gameState);
      setIsJoined(true);
      addLog(`✓ Joined game successfully as ${selectedCharacter}`);
    });

    socket.on('gameStateUpdate', (data) => {
      setGameState(data);
      addLog('Game state updated');
    });

    socket.on('playerJoined', (data) => {
      addLog(`Player ${data.player.name} joined as ${data.player.character}`);
    });

    socket.on('gameStarted', (data) => {
      setGameState(data.gameState);
      addLog('🎮 Game started! Turn-based gameplay enabled');
    });

    socket.on('moveResult', (data) => {
      if (data.success) {
        addLog(
          `✓ Move successful - ${
            data.movedToRoom ? 'Entered room' : 'Moved to hallway'
          }`
        );
      }
    });

    socket.on('error', (data) => {
      addLog(`❌ Error: ${data.message}`);
    });

    socket.on('suggestionMade', (data) => {
      if (data.success) {
        addLog(
          `${data.suggestedBy} suggests: ${data.suggestion.character} with ${data.suggestion.weapon} in ${data.suggestion.room}`
        );
      }
    });

    socket.on('accusationMade', (data) => {
      if (data.correct) {
        addLog(
          `🎉 ${data.accusedBy} wins! Correct accusation: ${data.accusation.character} with ${data.accusation.weapon} in ${data.accusation.room}`
        );
      } else {
        addLog(
          `❌ ${data.accusedBy} made an incorrect accusation and is eliminated!`
        );
      }
    });

    return () => {
      socket.off('gameJoined');
      socket.off('gameStateUpdate');
      socket.off('playerJoined');
      socket.off('gameStarted');
      socket.off('moveResult');
      socket.off('suggestionMade');
      socket.off('accusationMade');
      socket.off('error');
    };
  }, [selectedCharacter]);

  const joinGame = () => {
    if (playerName.trim() && selectedCharacter) {
      socket.emit('joinGame', {
        name: playerName.trim(),
        character: selectedCharacter,
      });
      addLog(`Attempting to join as ${selectedCharacter}...`);
    }
  };

  const markReady = () => {
    socket.emit('playerReady');
    addLog('Marked as ready - waiting for other players...');
  };

  const makeMove = (destination) => {
    socket.emit('makeMove', { destination });
    addLog(`Attempting to move to: ${destination}`);
  };

  const makeSuggestion = () => {
    if (suggestionData.character && suggestionData.weapon) {
      socket.emit('makeSuggestion', suggestionData);
      addLog(
        `Making suggestion: ${suggestionData.character} with ${suggestionData.weapon}`
      );
      setSuggestionData({ character: '', weapon: '' });
    }
  };

  const makeAccusation = () => {
    if (
      accusationData.character &&
      accusationData.weapon &&
      accusationData.room
    ) {
      socket.emit('makeAccusation', accusationData);
      addLog(
        `Making accusation: ${accusationData.character} with ${accusationData.weapon} in ${accusationData.room}`
      );
      setAccusationData({ character: '', weapon: '', room: '' });
    }
  };

  const getAvailableMoves = () => {
    if (!gameState || !playerId || !gameState.players[playerId]) return [];

    const player = gameState.players[playerId];
    const location = player.location;
    const moves = [];

    if (location.includes('-')) {
      // In hallway - can move to connected rooms
      const hallway = gameState.board.hallways[location];
      if (hallway) {
        hallway.connects.forEach((roomId) => {
          const room = gameState.board.rooms[roomId];
          if (room) {
            moves.push({ id: roomId, name: room.name, type: 'room' });
          }
        });
      }
    } else {
      // In room - can move to connected hallways (if empty)
      Object.entries(gameState.board.hallways).forEach(
        ([hallwayId, hallway]) => {
          if (hallway.connects.includes(location) && !hallway.player) {
            moves.push({ id: hallwayId, name: hallway.name, type: 'hallway' });
          }
        }
      );
    }

    return moves;
  };

  if (!isJoined) {
    return (
      <div style={styles.container}>
        <h1>CLUE-LESS SKELETAL INCREMENT</h1>
        <p>Architecture Demo: Client-Server Socket.IO Communication</p>

        <div>
          <h2>Join Game</h2>
          <p>
            Player Name:{' '}
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </p>
          <p>
            Character:
            <select
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
            >
              <option value="">Select character</option>
              {characters.map((char) => (
                <option key={char} value={char}>
                  {char}
                </option>
              ))}
            </select>
          </p>
          <button onClick={joinGame}>Join Game</button>
        </div>

        <div>
          <h3>Debug Logs:</h3>
          <pre style={styles.debugLog}>{logs.join('\n')}</pre>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState?.players[playerId];
  const isMyTurn = gameState?.currentPlayer === playerId;
  const availableMoves = getAvailableMoves();

  return (
    <div style={styles.container}>
      <h1>CLUE-LESS SKELETAL INCREMENT</h1>
      <p>
        Status: {gameState?.gamePhase} | Players:{' '}
        {Object.keys(gameState?.players || {}).length} | You:{' '}
        {currentPlayer?.character} | Location: {currentPlayer?.location}
      </p>
      {isMyTurn && (
        <p>
          <strong>*** YOUR TURN ***</strong>
        </p>
      )}

      <div style={styles.gameArea}>
        {/* Basic Game Controls */}
        <div style={styles.section}>
          <h3>GAME CONTROLS</h3>

          {!gameState?.gameStarted && (
            <div>
              <p>
                Players ready:{' '}
                {
                  Object.values(gameState?.players || {}).filter(
                    (p) => p.isReady
                  ).length
                }
                /{Object.keys(gameState?.players || {}).length}
              </p>
              {!currentPlayer?.isReady && (
                <button onClick={markReady}>Mark Ready</button>
              )}
            </div>
          )}

          {gameState?.gameStarted && isMyTurn && (
            <div>
              <h4>Available Moves:</h4>
              {availableMoves.length > 0 ? (
                <ul>
                  {availableMoves.map((move) => (
                    <li key={move.id}>
                      <button onClick={() => makeMove(move.id)}>
                        {move.name} ({move.type})
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No moves available</p>
              )}
            </div>
          )}

          {gameState?.gameStarted && !isMyTurn && (
            <p>
              Waiting for {gameState?.players[gameState?.currentPlayer]?.name}'s
              turn...
            </p>
          )}
        </div>

        {/* Suggestion/Accusation */}
        {gameState?.gameStarted && isMyTurn && (
          <div style={styles.section}>
            <h3>ACTIONS</h3>

            <div>
              <h4>Make Suggestion (current room):</h4>
              <p>
                Character:
                <select
                  value={suggestionData.character}
                  onChange={(e) =>
                    setSuggestionData({
                      ...suggestionData,
                      character: e.target.value,
                    })
                  }
                >
                  <option value="">Select</option>
                  {[
                    'Miss Scarlet',
                    'Colonel Mustard',
                    'Mrs. White',
                    'Mr. Green',
                    'Mrs. Peacock',
                    'Professor Plum',
                  ].map((char) => (
                    <option key={char} value={char}>
                      {char}
                    </option>
                  ))}
                </select>
              </p>
              <p>
                Weapon:
                <select
                  value={suggestionData.weapon}
                  onChange={(e) =>
                    setSuggestionData({
                      ...suggestionData,
                      weapon: e.target.value,
                    })
                  }
                >
                  <option value="">Select</option>
                  {weapons.map((weapon) => (
                    <option key={weapon} value={weapon}>
                      {weapon}
                    </option>
                  ))}
                </select>
              </p>
              <button onClick={makeSuggestion}>Make Suggestion</button>
            </div>

            <div>
              <h4>Make Accusation (WIN/LOSE):</h4>
              <p>
                Character:
                <select
                  value={accusationData.character}
                  onChange={(e) =>
                    setAccusationData({
                      ...accusationData,
                      character: e.target.value,
                    })
                  }
                >
                  <option value="">Select</option>
                  {[
                    'Miss Scarlet',
                    'Colonel Mustard',
                    'Mrs. White',
                    'Mr. Green',
                    'Mrs. Peacock',
                    'Professor Plum',
                  ].map((char) => (
                    <option key={char} value={char}>
                      {char}
                    </option>
                  ))}
                </select>
              </p>
              <p>
                Weapon:
                <select
                  value={accusationData.weapon}
                  onChange={(e) =>
                    setAccusationData({
                      ...accusationData,
                      weapon: e.target.value,
                    })
                  }
                >
                  <option value="">Select</option>
                  {weapons.map((weapon) => (
                    <option key={weapon} value={weapon}>
                      {weapon}
                    </option>
                  ))}
                </select>
              </p>
              <p>
                Room:
                <select
                  value={accusationData.room}
                  onChange={(e) =>
                    setAccusationData({
                      ...accusationData,
                      room: e.target.value,
                    })
                  }
                >
                  <option value="">Select</option>
                  {rooms.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              </p>
              <button onClick={makeAccusation}>Make Accusation (FINAL)</button>
            </div>
          </div>
        )}

        {/* Game State Display */}
        <div style={styles.section}>
          <h3>BOARD STATE</h3>
          <div>
            <h4>Rooms with Players:</h4>
            <ul>
              {Object.entries(gameState?.board?.rooms || {}).map(
                ([roomId, room]) =>
                  room.players.length > 0 && (
                    <li key={roomId}>
                      {room.name}: {room.players.join(', ')}
                    </li>
                  )
              )}
            </ul>

            <h4>Hallways with Players:</h4>
            <ul>
              {Object.entries(gameState?.board?.hallways || {}).map(
                ([hallwayId, hallway]) =>
                  hallway.player && (
                    <li key={hallwayId}>
                      {hallway.name}: {hallway.player}
                    </li>
                  )
              )}
            </ul>
          </div>
        </div>

        {/* Debug Logs */}
        <div style={styles.section}>
          <h3>DEBUG LOG</h3>
          <pre style={styles.debugLog}>{logs.slice(-10).join('\n')}</pre>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    color: '#333333',
    minHeight: '100vh',
  },
  gameArea: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
  },
  section: {
    flex: '1 1 300px',
    border: '1px solid #ccc',
    padding: '15px',
    backgroundColor: 'white',
    color: '#222222',
  },
  debugLog: {
    backgroundColor: '#f0f0f0',
    color: '#000000',
    padding: '10px',
    border: '1px solid #ddd',
    height: '200px',
    overflow: 'auto',
    fontSize: '12px',
  },
};

export default App;
