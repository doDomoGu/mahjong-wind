import { io } from 'socket.io-client';

const TOKEN_KEY = 'mahjong-wind-token';
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || '/socket.io';

export function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch (error) {
    return '';
  }
}

export function saveToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    // 隐私模式忽略
  }
}

export async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = options.token || loadToken();
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }
  const res = await fetch(API_BASE + path, {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({ ok: false, error: '服务器无响应' }));
  if (!data.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

let socket = null;

export function connectSocket(token, handlers) {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = io({
    path: SOCKET_PATH,
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  if (handlers && handlers.onRoom) {
    socket.on('room', handlers.onRoom);
  }
  if (handlers && handlers.onRoomsChanged) {
    socket.on('rooms-changed', handlers.onRoomsChanged);
  }
  return socket;
}

export function watchRoom(id) {
  if (socket && id) {
    socket.emit('watch', id);
  }
}

export function unwatchRoom() {
  if (socket) {
    socket.emit('unwatch');
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
