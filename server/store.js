const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'store.json');

function empty() {
  return { players: {}, rooms: {}, matches: {} };
}

function load() {
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      return {
        players: parsed.players || {},
        rooms: parsed.rooms || {},
        matches: parsed.matches || {},
      };
    }
  } catch (error) {
    console.error('读取本地数据失败，将使用空库', error.message);
  }
  return empty();
}

const db = load();

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

function listRooms() {
  return Object.values(db.rooms);
}

function getRoom(id) {
  return db.rooms[String(id)] || null;
}

function saveRoom(room) {
  db.rooms[String(room.id)] = room;
  save();
  return room;
}

function deleteRoom(id) {
  delete db.rooms[String(id)];
  save();
}

function findRoomByPlayer(userId) {
  return listRooms().find((room) => (room.players || []).some((player) => player.id === userId)) || null;
}

function getPlayer(id) {
  return db.players[id] || null;
}

function getPlayerByToken(token) {
  if (!token) {
    return null;
  }
  return Object.values(db.players).find((player) => player.token === token) || null;
}

function getPlayerByName(name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) {
    return null;
  }
  return Object.values(db.players).find((player) => String(player.name || '').toLowerCase() === key) || null;
}

function saveMatch(match) {
  const prev = db.matches[String(match.id)];
  if (prev && prev.finishedAt) {
    match.finishedAt = prev.finishedAt;
  }
  db.matches[String(match.id)] = match;
  save();
  return match;
}

function deleteMatch(id) {
  delete db.matches[String(id)];
  save();
}

function listMatchesByPlayer(userId) {
  return Object.values(db.matches)
    .filter((match) => (match.results || []).some((row) => row.id === userId))
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));
}

function savePlayer(player) {
  db.players[player.id] = player;
  save();
  return player;
}

function renameInRooms(userId, name) {
  let changed = false;
  listRooms().forEach((room) => {
    if (room.hostId === userId && room.hostName !== name) {
      room.hostName = name;
      changed = true;
    }
    (room.players || []).forEach((player) => {
      if (player.id === userId && player.name !== name) {
        player.name = name;
        changed = true;
      }
    });
  });
  if (changed) {
    save();
  }
}

module.exports = {
  listRooms,
  getRoom,
  saveRoom,
  deleteRoom,
  findRoomByPlayer,
  getPlayer,
  getPlayerByToken,
  getPlayerByName,
  savePlayer,
  renameInRooms,
  saveMatch,
  deleteMatch,
  listMatchesByPlayer,
};
