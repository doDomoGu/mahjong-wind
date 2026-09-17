const gameLogic = require('./gameLogic');
const store = require('./store');

let notify = () => {};

function setNotifier(fn) {
  notify = fn;
}

function fail(error) {
  const err = new Error(error);
  err.expose = true;
  throw err;
}

function normalize(room) {
  if (!room) {
    return null;
  }
  return {
    id: room.id,
    status: room.status,
    hostId: room.hostId,
    hostName: room.hostName,
    players: room.players || [],
    seats: room.seats || null,
    game: room.game || null,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

function isBot(player) {
  return !!(player && player.id && String(player.id).indexOf('bot-') === 0);
}

function uniqueCode() {
  for (let i = 0; i < 40; i += 1) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if (!store.getRoom(code)) {
      return code;
    }
  }
  fail('无法分配房号');
}

function startRoom(room) {
  const shuffled = room.players.slice().sort(() => Math.random() - 0.5);
  room.seats = {
    E: shuffled[0].id,
    S: shuffled[1].id,
    W: shuffled[2].id,
    N: shuffled[3].id,
  };
  room.status = 'playing';
  room.game = gameLogic.createInitialGame(room.players);
}

function removePlayerAndBots(room, userId) {
  room.players = room.players.filter((player) => player.id !== userId && !isBot(player));
  if (room.seats) {
    Object.keys(room.seats).forEach((wind) => {
      const seatId = room.seats[wind];
      if (!seatId || seatId === userId || String(seatId).indexOf('bot-') === 0) {
        room.seats[wind] = null;
      }
    });
  }
  if (room.status === 'playing' && room.players.length < 4) {
    room.status = 'waiting';
    room.seats = null;
    room.game = null;
  }
}

function persist(room) {
  if (room.game && room.game.phase === 'finished') {
    room.status = 'finished';
    store.saveMatch(buildMatch(room));
  }
  room.updatedAt = Date.now();
  store.saveRoom(room);
  const next = normalize(room);
  notify(next);
  return next;
}

function buildMatch(room) {
  const results = (room.game && room.game.results) || [];
  return {
    id: room.id,
    roomId: room.id,
    finishedAt: Date.now(),
    results: results.map((row) => {
      const player = (room.players || []).find((item) => item.id === row.id);
      return {
        id: row.id,
        name: player ? player.name : row.id,
        wind: gameLogic.playerWind(room.seats, row.id),
        rank: row.rank,
        score: row.score,
        uma: row.uma,
        pt: row.pt,
      };
    }),
  };
}

function requireSeated(room, userId) {
  if (!room.game) {
    fail('对局尚未开始');
  }
  if (gameLogic.seatedIds(room.seats).indexOf(userId) < 0) {
    fail('你不在这桌');
  }
}

function listRooms() {
  const rank = { waiting: 0, playing: 1, finished: 2 };
  return store.listRooms().map(normalize).sort((a, b) => {
    return (rank[a.status] - rank[b.status]) || (b.createdAt - a.createdAt);
  });
}

function getRoom(code) {
  return normalize(store.getRoom(code));
}

function findMyRoom(userId) {
  return normalize(store.findRoomByPlayer(userId));
}

function createRoom(user) {
  const occupied = store.findRoomByPlayer(user.id);
  if (occupied) {
    fail('你已经在房间 ' + occupied.id + ' 里，请先离开');
  }

  const now = Date.now();
  const room = {
    id: uniqueCode(),
    status: 'waiting',
    hostId: user.id,
    hostName: user.name,
    players: [{ id: user.id, name: user.name, avatar: user.avatar || '' }],
    seats: null,
    game: null,
    createdAt: now,
    updatedAt: now,
  };
  store.saveRoom(room);
  const next = normalize(room);
  notify(next);
  return next;
}

function joinRoom(code, user) {
  const room = store.getRoom(code);
  if (!room) {
    fail('房间不存在');
  }
  if (room.players.some((player) => player.id === user.id)) {
    return persist(room);
  }

  const occupied = store.findRoomByPlayer(user.id);
  if (occupied && occupied.id !== room.id) {
    fail('你已经在房间 ' + occupied.id + ' 里，请先离开');
  }
  if (room.status !== 'waiting') {
    fail('对局中不能再占座，请走公共视角');
  }
  if (room.players.length >= 4) {
    fail('房间已满');
  }

  room.players.push({ id: user.id, name: user.name, avatar: user.avatar || '' });
  if (room.players.length === 4) {
    startRoom(room);
  }
  return persist(room);
}

function leaveRoom(code, userId) {
  const room = store.getRoom(code);
  if (!room) {
    notify(null, { dissolved: true, code: String(code) });
    return { dissolved: true, room: null };
  }

  if (room.status === 'waiting' && room.hostId === userId) {
    store.deleteRoom(room.id);
    notify(null, { dissolved: true, code: room.id });
    return { dissolved: true, room: null };
  }

  removePlayerAndBots(room, userId);

  if (room.players.length === 0) {
    store.deleteRoom(room.id);
    notify(null, { dissolved: true, code: room.id });
    return { dissolved: true, room: null };
  }

  return { dissolved: false, room: persist(room) };
}

function fillBots(code, userId) {
  const room = store.getRoom(code);
  if (!room) {
    fail('房间不存在');
  }
  if (room.status !== 'waiting') {
    fail('对局已开始');
  }
  if (!userId || !room.players.some((player) => player.id === userId)) {
    fail('你不在这个房间');
  }

  const names = ['测试南家', '测试西家', '测试北家'];
  const used = {};
  room.players.forEach((player) => {
    used[player.id] = true;
  });
  let index = 0;
  while (room.players.length < 4 && index < names.length) {
    const botId = 'bot-' + room.id + '-' + index;
    if (!used[botId]) {
      room.players.push({
        id: botId,
        name: names[index],
        avatar: '',
      });
      used[botId] = true;
    }
    index += 1;
  }
  if (room.players.length === 4) {
    startRoom(room);
  }
  return persist(room);
}

function playRiichi(code, userId, targetId) {
  const room = store.getRoom(code);
  if (!room) {
    fail('房间不存在');
  }
  requireSeated(room, userId);
  gameLogic.applyRiichi(room.game, targetId || userId);
  return persist(room);
}

function playCancelRiichi(code, userId, targetId) {
  const room = store.getRoom(code);
  if (!room) {
    fail('房间不存在');
  }
  requireSeated(room, userId);
  gameLogic.cancelRiichi(room.game, targetId || userId);
  return persist(room);
}

function playStartSettle(code, userId, kind, dealerFlag) {
  const room = store.getRoom(code);
  if (!room) {
    fail('房间不存在');
  }
  requireSeated(room, userId);
  gameLogic.startSettle(room.game, room.seats, kind, dealerFlag);
  return persist(room);
}

function playSubmitSettle(code, userId, value) {
  const room = store.getRoom(code);
  if (!room) {
    fail('房间不存在');
  }
  requireSeated(room, userId);
  const settleStatus = gameLogic.submitSettle(room.game, room.seats, userId, value);
  return { room: persist(room), settleStatus };
}

function playUndo(code, userId) {
  const room = store.getRoom(code);
  if (!room) {
    fail('房间不存在');
  }
  requireSeated(room, userId);
  const wasFinished = room.status === 'finished' || (room.game && room.game.phase === 'finished');
  gameLogic.undoLastHand(room.game);
  room.status = 'playing';
  if (wasFinished) {
    store.deleteMatch(room.id);
  }
  return persist(room);
}

module.exports = {
  setNotifier,
  listRooms,
  getRoom,
  findMyRoom,
  createRoom,
  joinRoom,
  leaveRoom,
  fillBots,
  playRiichi,
  playCancelRiichi,
  playStartSettle,
  playSubmitSettle,
  playUndo,
};
