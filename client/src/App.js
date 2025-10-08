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
        <div style={styles.header}>
          <h1>🕵️ CLUE-LESS</h1>
          <p>
            <strong>Architecture Demo:</strong> Client-Server Communication
          </p>
        </div>

        <div style={styles.joinForm}>
          <h2>Join Game (Basic Console Interface)</h2>

          <div style={styles.formGroup}>
            <label>Player Name:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Character:</label>
            <select
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              style={styles.input}
            >
              <option value="">Select character</option>
              {characters.map((char) => (
                <option key={char} value={char}>
                  {char}
                </option>
              ))}
            </select>
          </div>

          <button onClick={joinGame} style={styles.button}>
            Join Game
          </button>
        </div>

        <div style={styles.logs}>
          <h3>Connection Logs:</h3>
          <div style={styles.logContainer}>
            {logs.map((log, index) => (
              <div key={index} style={styles.logEntry}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState?.players[playerId];
  const isMyTurn = gameState?.currentPlayer === playerId;
  const availableMoves = getAvailableMoves();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>🕵️ CLUE-LESS</h1>
        <div style={styles.headerInfo}>
          <span>
            <strong>Status:</strong> {gameState?.gamePhase}
          </span>
          <span>
            <strong>Players:</strong>{' '}
            {Object.keys(gameState?.players || {}).length}
          </span>
          <span>
            <strong>You:</strong> {currentPlayer?.name} (
            {currentPlayer?.character})
          </span>
          <span>
            <strong>Location:</strong> {currentPlayer?.location}
          </span>
          {isMyTurn && <span style={styles.highlight}>🎯 YOUR TURN</span>}
        </div>
      </div>

      <div style={styles.mainLayout}>
        {/* Left Column - Game Controls */}
        <div style={styles.leftColumn}>
          <h3>🎮 Game Controls</h3>

          {!gameState?.gameStarted && (
            <div style={styles.readySection}>
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
                <button onClick={markReady} style={styles.button}>
                  Mark Ready
                </button>
              )}
            </div>
          )}

          {gameState?.gameStarted && isMyTurn && (
            <div>
              <h4>Available Moves:</h4>
              {availableMoves.length > 0 ? (
                <div style={styles.moveButtons}>
                  {availableMoves.map((move) => (
                    <button
                      key={move.id}
                      onClick={() => makeMove(move.id)}
                      style={styles.moveButton}
                    >
                      {move.name} ({move.type})
                    </button>
                  ))}
                </div>
              ) : (
                <p>No moves available</p>
              )}
            </div>
          )}

          {gameState?.gameStarted && !isMyTurn && (
            <p style={styles.waitingText}>
              Waiting for {gameState?.players[gameState?.currentPlayer]?.name}'s
              turn...
            </p>
          )}
        </div>

        {/* Center Column - Game Actions */}
        <div style={styles.centerColumn}>
          {gameState?.gameStarted && isMyTurn && (
            <>
              {/* Suggestion Form */}
              <div style={styles.compactForm}>
                <h4>🔍 Make Suggestion</h4>
                <div style={styles.formRow}>
                  <select
                    style={styles.compactSelect}
                    value={suggestionData.character}
                    onChange={(e) =>
                      setSuggestionData({
                        ...suggestionData,
                        character: e.target.value,
                      })
                    }
                  >
                    <option value="">Character</option>
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
                  <select
                    style={styles.compactSelect}
                    value={suggestionData.weapon}
                    onChange={(e) =>
                      setSuggestionData({
                        ...suggestionData,
                        weapon: e.target.value,
                      })
                    }
                  >
                    <option value="">Weapon</option>
                    {weapons.map((weapon) => (
                      <option key={weapon} value={weapon}>
                        {weapon}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={makeSuggestion} style={styles.actionButton}>
                  Suggest
                </button>
              </div>

              {/* Accusation Form */}
              <div style={styles.compactForm}>
                <h4>⚡ Make Accusation</h4>
                <div style={styles.formRow}>
                  <select
                    style={styles.compactSelect}
                    value={accusationData.character}
                    onChange={(e) =>
                      setAccusationData({
                        ...accusationData,
                        character: e.target.value,
                      })
                    }
                  >
                    <option value="">Character</option>
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
                  <select
                    style={styles.compactSelect}
                    value={accusationData.weapon}
                    onChange={(e) =>
                      setAccusationData({
                        ...accusationData,
                        weapon: e.target.value,
                      })
                    }
                  >
                    <option value="">Weapon</option>
                    {weapons.map((weapon) => (
                      <option key={weapon} value={weapon}>
                        {weapon}
                      </option>
                    ))}
                  </select>
                  <select
                    style={styles.compactSelect}
                    value={accusationData.room}
                    onChange={(e) =>
                      setAccusationData({
                        ...accusationData,
                        room: e.target.value,
                      })
                    }
                  >
                    <option value="">Room</option>
                    {rooms.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={makeAccusation} style={styles.warningButton}>
                  Accuse (Risky!)
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Column - Board State and Logs */}
        <div style={styles.rightColumn}>
          <h4>🗺️ Board State</h4>
          <div style={styles.boardSection}>
            <div style={styles.compactBoard}>
              <h5>Rooms:</h5>
              <div style={styles.roomList}>
                {Object.entries(gameState?.board?.rooms || {}).map(
                  ([roomId, room]) =>
                    room.players.length > 0 && (
                      <div key={roomId} style={styles.compactLocationEntry}>
                        {room.name}: {room.players.join(', ')}
                      </div>
                    )
                )}
              </div>

              <h5>Hallways:</h5>
              <div style={styles.hallwayList}>
                {Object.entries(gameState?.board?.hallways || {}).map(
                  ([hallwayId, hallway]) =>
                    hallway.player && (
                      <div key={hallwayId} style={styles.compactLocationEntry}>
                        {hallway.name}: {hallway.player}
                      </div>
                    )
                )}
              </div>
            </div>
          </div>

          <h4>📡 Activity Log</h4>
          <div style={styles.compactLogContainer}>
            {logs.slice(-8).map((log, index) => (
              <div key={index} style={styles.compactLogEntry}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '95vw',
    margin: '0 auto',
    padding: '10px',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    fontFamily: 'monospace',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: '15px',
    padding: '12px',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
  },
  headerInfo: {
    display: 'flex',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: '8px',
    fontSize: '16px',
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '20px',
    height: 'calc(100vh - 180px)',
  },
  leftColumn: {
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderRadius: '8px',
    overflow: 'auto',
  },
  centerColumn: {
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderRadius: '8px',
    overflow: 'auto',
  },
  rightColumn: {
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderRadius: '8px',
    overflow: 'auto',
  },
  readySection: {
    backgroundColor: '#3a3a3a',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '15px',
    fontSize: '15px',
  },
  compactForm: {
    backgroundColor: '#3a3a3a',
    padding: '18px',
    borderRadius: '6px',
    marginBottom: '18px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  compactSelect: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#4a4a4a',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px',
  },
  boardSection: {
    marginBottom: '20px',
  },
  compactBoard: {
    backgroundColor: '#3a3a3a',
    padding: '15px',
    borderRadius: '6px',
  },
  roomList: {
    marginBottom: '15px',
  },
  hallwayList: {
    marginBottom: '15px',
  },
  compactLocationEntry: {
    padding: '6px 10px',
    backgroundColor: '#4a4a4a',
    margin: '4px 0',
    borderRadius: '3px',
    fontSize: '13px',
  },
  compactLogContainer: {
    backgroundColor: '#1a1a1a',
    padding: '12px',
    borderRadius: '6px',
    maxHeight: '250px',
    overflowY: 'auto',
    border: '1px solid #555',
  },
  compactLogEntry: {
    padding: '4px 0',
    fontSize: '12px',
    color: '#cccccc',
    borderBottom: '1px solid #333',
  },
  waitingText: {
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
    fontSize: '15px',
  },
  section: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
  },
  card: {
    backgroundColor: '#3a3a3a',
    padding: '15px',
    borderRadius: '8px',
  },
  joinForm: {
    backgroundColor: '#2a2a2a',
    padding: '30px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  input: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3a3a3a',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#ffffff',
    marginTop: '5px',
  },
  select: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3a3a3a',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#ffffff',
    marginTop: '5px',
  },
  button: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: '5px',
  },
  moveButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  moveButton: {
    backgroundColor: '#2196F3',
    color: 'white',
    padding: '12px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
  },
  formSection: {
    backgroundColor: '#3a3a3a',
    padding: '20px',
    borderRadius: '8px',
    margin: '15px 0',
  },
  actionButton: {
    backgroundColor: '#FF9800',
    color: 'white',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: '8px 0',
    fontSize: '14px',
  },
  warningButton: {
    backgroundColor: '#f44336',
    color: 'white',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: '8px 0',
    fontSize: '14px',
  },
  highlight: {
    color: '#ff6b6b',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  boardInfo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  column: {
    backgroundColor: '#3a3a3a',
    padding: '15px',
    borderRadius: '8px',
  },
  locationEntry: {
    padding: '5px',
    backgroundColor: '#4a4a4a',
    margin: '5px 0',
    borderRadius: '4px',
    fontSize: '14px',
  },
  logContainer: {
    backgroundColor: '#1a1a1a',
    padding: '15px',
    borderRadius: '8px',
    maxHeight: '200px',
    overflowY: 'auto',
    border: '1px solid #555',
  },
  logEntry: {
    padding: '3px 0',
    fontSize: '12px',
    color: '#cccccc',
    borderBottom: '1px solid #333',
  },
};

export default App;
