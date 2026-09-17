const path = require('path');
const os = require('os');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const rooms = require('./rooms');
const store = require('./store');
const accounts = require('./auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

rooms.setNotifier((room, extra) => {
  if (extra && extra.dissolved && extra.code) {
    io.to('room:' + extra.code).emit('room', null);
  } else if (room) {
    io.to('room:' + room.id).emit('room', room);
  }
  io.to('lobby').emit('rooms-changed');
});

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = accounts.userFromToken(token);
  if (!user) {
    res.status(401).json({ ok: false, error: '请先登录' });
    return;
  }
  req.user = user;
  next();
}

function sendOk(res, payload) {
  res.json(Object.assign({ ok: true }, payload));
}

function sendError(res, error, status) {
  res.status(status || 400).json({ ok: false, error: error.message || String(error) });
}

function wrap(handler) {
  return (req, res) => {
    try {
      const payload = handler(req);
      sendOk(res, payload);
    } catch (error) {
      sendError(res, error);
    }
  };
}

app.get('/api/health', (req, res) => {
  sendOk(res, { status: 'ok' });
});

app.post('/api/register', wrap((req) => ({
  user: accounts.register(req.body && req.body.name, req.body && req.body.password),
})));

app.post('/api/login', wrap((req) => ({
  user: accounts.login(req.body && req.body.name, req.body && req.body.password),
})));

app.post('/api/logout', requireAuth, wrap((req) => {
  accounts.logout(req.user);
  return {};
}));

app.get('/api/me', requireAuth, wrap((req) => ({
  user: accounts.publicUser(req.user),
})));

app.get('/api/history', requireAuth, wrap((req) => ({
  matches: store.listMatchesByPlayer(req.user.id),
})));

app.get('/api/rooms', requireAuth, wrap(() => ({ rooms: rooms.listRooms() })));

app.get('/api/rooms/mine', requireAuth, wrap((req) => ({ room: rooms.findMyRoom(req.user.id) })));

app.get('/api/rooms/:code', requireAuth, wrap((req) => {
  const room = rooms.getRoom(req.params.code);
  if (!room) {
    throw new Error('房间不存在');
  }
  return { room };
}));

app.post('/api/rooms', requireAuth, wrap((req) => ({ room: rooms.createRoom(req.user) })));

app.post('/api/rooms/:code/join', requireAuth, wrap((req) => ({
  room: rooms.joinRoom(req.params.code, req.user),
})));

app.post('/api/rooms/:code/leave', requireAuth, wrap((req) => rooms.leaveRoom(req.params.code, req.user.id)));

app.post('/api/rooms/:code/fill-bots', requireAuth, wrap((req) => ({
  room: rooms.fillBots(req.params.code, req.user.id),
})));

app.post('/api/rooms/:code/riichi', requireAuth, wrap((req) => ({
  room: rooms.playRiichi(req.params.code, req.user.id, req.body && req.body.targetId),
})));

app.post('/api/rooms/:code/cancel-riichi', requireAuth, wrap((req) => ({
  room: rooms.playCancelRiichi(req.params.code, req.user.id, req.body && req.body.targetId),
})));

app.post('/api/rooms/:code/settle/start', requireAuth, wrap((req) => ({
  room: rooms.playStartSettle(
    req.params.code,
    req.user.id,
    req.body && req.body.kind,
    req.body && req.body.dealerFlag,
  ),
})));

app.post('/api/rooms/:code/settle/submit', requireAuth, wrap((req) => {
  const result = rooms.playSubmitSettle(req.params.code, req.user.id, req.body && req.body.value);
  return { room: result.room, settleStatus: result.settleStatus };
}));

app.post('/api/rooms/:code/undo', requireAuth, wrap((req) => ({
  room: rooms.playUndo(req.params.code, req.user.id),
})));

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  const user = accounts.userFromToken(token);
  if (!user) {
    next(new Error('请先登录'));
    return;
  }
  socket.data.user = user;
  next();
});

io.on('connection', (socket) => {
  socket.join('lobby');

  socket.on('watch', (code) => {
    Array.from(socket.rooms).forEach((roomName) => {
      if (roomName.startsWith('room:')) {
        socket.leave(roomName);
      }
    });
    if (!code) {
      return;
    }
    socket.join('room:' + code);
    socket.emit('room', rooms.getRoom(code));
  });

  socket.on('unwatch', () => {
    Array.from(socket.rooms).forEach((roomName) => {
      if (roomName.startsWith('room:')) {
        socket.leave(roomName);
      }
    });
  });
});

const dist = path.join(__dirname, '..', 'client', 'dist');
if (isProd || require('fs').existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      next();
      return;
    }
    res.sendFile(path.join(dist, 'index.html'));
  });
}

function lanAddresses() {
  const result = [];
  const ifaces = os.networkInterfaces();
  Object.values(ifaces).forEach((list) => {
    (list || []).forEach((item) => {
      if (item.family === 'IPv4' && !item.internal) {
        result.push(item.address);
      }
    });
  });
  return result;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  立直麻将 · 风向盘 已启动');
  console.log('  本机    http://localhost:' + PORT);
  lanAddresses().forEach((ip) => {
    console.log('  局域网  http://' + ip + ':' + PORT);
  });
  console.log('');
  if (!isProd) {
    console.log('  开发模式请另开前端：npm run client');
    console.log('');
  }
});
