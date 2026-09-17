const crypto = require('crypto');
const store = require('./store');

function fail(error) {
  const err = new Error(error);
  err.expose = true;
  throw err;
}

function sanitizeName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().slice(0, 12);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  if (!stored || stored.indexOf(':') < 0) {
    return false;
  }
  const [salt, hash] = stored.split(':');
  const next = crypto.scryptSync(String(password), salt, 32);
  const prev = Buffer.from(hash, 'hex');
  if (prev.length !== next.length) {
    return false;
  }
  return crypto.timingSafeEqual(prev, next);
}

function publicUser(player) {
  return {
    id: player.id,
    name: player.name,
    token: player.token,
  };
}

function issueToken(player) {
  player.token = crypto.randomUUID();
  player.updatedAt = Date.now();
  store.savePlayer(player);
  return publicUser(player);
}

function validateName(name) {
  const next = sanitizeName(name);
  if (next.length < 2) {
    fail('账号至少 2 个字');
  }
  return next;
}

function validatePassword(password) {
  const next = String(password || '');
  if (next.length < 4) {
    fail('密码至少 4 位');
  }
  if (next.length > 32) {
    fail('密码最多 32 位');
  }
  return next;
}

function register(name, password) {
  const account = validateName(name);
  validatePassword(password);
  const existing = store.getPlayerByName(account);
  if (existing && existing.passwordHash) {
    fail('这个账号已被注册');
  }
  if (existing && !existing.passwordHash) {
    existing.name = account;
    existing.passwordHash = hashPassword(password);
    return issueToken(existing);
  }
  const now = Date.now();
  const player = {
    id: crypto.randomUUID(),
    name: account,
    passwordHash: hashPassword(password),
    token: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  store.savePlayer(player);
  return publicUser(player);
}

function login(name, password) {
  const account = validateName(name);
  validatePassword(password);
  const player = store.getPlayerByName(account);
  if (!player || !player.passwordHash || !verifyPassword(password, player.passwordHash)) {
    fail('账号或密码不对');
  }
  return issueToken(player);
}

function logout(user) {
  if (user) {
    user.token = '';
    user.updatedAt = Date.now();
    store.savePlayer(user);
  }
}

function userFromToken(token) {
  const player = store.getPlayerByToken(token);
  if (!player || !player.passwordHash) {
    return null;
  }
  return player;
}

module.exports = {
  sanitizeName,
  publicUser,
  register,
  login,
  logout,
  userFromToken,
};
