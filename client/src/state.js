import { reactive } from 'vue';
import {
  connectSocket,
  disconnectSocket,
  loadToken,
  request,
  saveToken,
  unwatchRoom,
  watchRoom,
} from './api.js';

export const state = reactive({
  ready: false,
  user: { id: '', name: '', token: '' },
  rooms: [],
  room: null,
  myRoom: null,
  viewMode: 'player',
  screen: 'auth',
  history: [],
  scoreMode: 'absolute',
  toast: '',
  toastUntil: 0,
  confirm: { visible: false, title: '', message: '', resolve: null },
  roomPad: { visible: false, title: '', resolve: null },
  scorePad: { visible: false, resolve: null },
  wizard: { visible: false, step: 'kind', kind: null },
});

let toastTimer = 0;

export function toast(message) {
  state.toast = message;
  state.toastUntil = Date.now() + 2200;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    state.toast = '';
  }, 2200);
}

export function askYesNo(title, message) {
  return new Promise((resolve) => {
    state.confirm = { visible: true, title, message, resolve };
  });
}

export function closeConfirm(ok) {
  const resolve = state.confirm.resolve;
  state.confirm = { visible: false, title: '', message: '', resolve: null };
  if (resolve) {
    resolve(!!ok);
  }
}

export function askRoomCode(title) {
  return new Promise((resolve) => {
    state.roomPad = { visible: true, title, resolve };
  });
}

export function closeRoomPad(code) {
  const resolve = state.roomPad.resolve;
  state.roomPad = { visible: false, title: '', resolve: null };
  if (resolve) {
    resolve(code || '');
  }
}

export function askDelta() {
  return new Promise((resolve) => {
    state.scorePad = { visible: true, resolve };
  });
}

export function closeScorePad(value) {
  const resolve = state.scorePad.resolve;
  state.scorePad = { visible: false, resolve: null };
  if (resolve) {
    resolve(value);
  }
}

function applyUser(user) {
  state.user.id = user.id;
  state.user.name = user.name;
  state.user.token = user.token;
  saveToken(user.token);
}

export function goto(name) {
  if (name === 'lobby') {
    unwatchRoom();
  }
  state.screen = name;
  if (name === 'table') {
    state.scoreMode = 'absolute';
    state.wizard.visible = false;
  }
}

function handleRoomWatch(room) {
  if (!room) {
    state.room = null;
    state.myRoom = null;
    if (state.screen !== 'lobby' && state.screen !== 'auth' && state.screen !== 'history') {
      goto('lobby');
      toast('房间已解散');
      refreshList(false);
    }
    return;
  }
  state.room = room;
  if (state.viewMode === 'player') {
    state.myRoom = room;
  }
  if (state.viewMode === 'player' && room.status === 'waiting' && state.screen === 'table') {
    goto('waiting');
    toast('有人离开，回到等待房');
    return;
  }
  if (
    state.viewMode === 'player'
    && (room.status === 'playing' || room.status === 'finished')
    && state.screen === 'waiting'
  ) {
    goto('table');
    toast(room.status === 'playing' ? '满员，已随机入座' : '半庄结束');
  }
}

export async function refreshList(showToastMessage) {
  const data = await request('/api/rooms', { token: state.user.token });
  state.rooms = data.rooms || [];
  const listed = state.rooms.find((room) => (room.players || []).some((player) => player.id === state.user.id));
  state.myRoom = listed || state.myRoom;
  if (!listed) {
    try {
      const mine = await request('/api/rooms/mine', { token: state.user.token });
      state.myRoom = mine.room || null;
    } catch (error) {
      state.myRoom = null;
    }
  }
  if (showToastMessage) {
    toast('已刷新房间列表');
  }
}

export async function refreshCurrent(showToastMessage) {
  if (state.screen === 'lobby') {
    await refreshList(!!showToastMessage);
    return;
  }
  if (!state.room) {
    return;
  }
  const data = await request('/api/rooms/' + state.room.id, { token: state.user.token });
  state.room = data.room;
  if (state.viewMode === 'player') {
    state.myRoom = data.room;
  }
  if (data.room.status === 'playing' && state.screen === 'waiting' && state.viewMode === 'player') {
    goto('table');
    toast('满员，已随机入座');
    return;
  }
  if (showToastMessage) {
    toast('已刷新');
  }
}

function subscribeRoom(id) {
  watchRoom(id);
}

function bindSocket() {
  connectSocket(state.user.token, {
    onRoom: handleRoomWatch,
    onRoomsChanged: () => {
      if (state.screen === 'lobby') {
        refreshList(false).catch(() => {});
      }
    },
  });
}

export async function enterApp(user) {
  applyUser(user);
  bindSocket();
  await refreshList(false);
  goto('lobby');
}

export async function boot() {
  state.screen = 'auth';
  const token = loadToken();
  if (token) {
    try {
      const data = await request('/api/me', { token });
      await enterApp(data.user);
    } catch (error) {
      saveToken('');
    }
  }
  state.ready = true;
}

export async function registerAccount(name, password) {
  const data = await request('/api/register', { body: { name, password } });
  await enterApp(data.user);
  toast('注册成功，已进入大厅');
}

export async function loginAccount(name, password) {
  const data = await request('/api/login', { body: { name, password } });
  await enterApp(data.user);
  toast('欢迎回来，' + data.user.name);
}

export async function logoutAccount() {
  const ok = await askYesNo('退出登录', '不会删除账号和战绩，下次用同一账号密码即可回来。');
  if (!ok) {
    return;
  }
  try {
    await request('/api/logout', { token: state.user.token, body: {} });
  } catch (error) {
    // 本地也清掉
  }
  disconnectSocket();
  saveToken('');
  state.user = { id: '', name: '', token: '' };
  state.rooms = [];
  state.room = null;
  state.myRoom = null;
  state.history = [];
  state.viewMode = 'player';
  goto('auth');
  toast('已退出登录');
}

export async function refreshHistory() {
  const data = await request('/api/history', { token: state.user.token });
  state.history = data.matches || [];
}

export async function openHistory() {
  await refreshHistory();
  goto('history');
}

export async function createRoom() {
  const data = await request('/api/rooms', { token: state.user.token, body: {} });
  state.room = data.room;
  state.myRoom = data.room;
  state.viewMode = 'player';
  goto('waiting');
  subscribeRoom(data.room.id);
  toast('已创建房间 ' + data.room.id);
}

export async function joinRoom(id) {
  const data = await request('/api/rooms/' + id + '/join', {
    token: state.user.token,
    body: {},
  });
  state.room = data.room;
  state.myRoom = data.room;
  state.viewMode = 'player';
  subscribeRoom(data.room.id);
  if (data.room.status === 'playing') {
    goto('table');
    toast('满员，已随机入座');
    return;
  }
  goto('waiting');
}

export async function enterPublic(id) {
  const data = await request('/api/rooms/' + id, { token: state.user.token });
  state.room = data.room;
  state.viewMode = 'public';
  goto('table');
  subscribeRoom(data.room.id);
  toast('已进入公共视角');
}

export async function openRoomFromList(room) {
  if (state.myRoom && room.id === state.myRoom.id) {
    await returnToRoom();
    return;
  }
  if (state.myRoom) {
    toast('你已在房间 ' + state.myRoom.id + '，请先回到房间');
    return;
  }
  if (room.status === 'waiting') {
    await joinRoom(room.id);
    return;
  }
  await enterPublic(room.id);
}

export async function returnToRoom() {
  if (!state.myRoom) {
    return;
  }
  const data = await request('/api/rooms/' + state.myRoom.id, { token: state.user.token });
  state.room = data.room;
  state.myRoom = data.room;
  state.viewMode = 'player';
  subscribeRoom(data.room.id);
  if (data.room.status === 'waiting') {
    goto('waiting');
  } else {
    goto('table');
  }
  toast('已回到房间 ' + data.room.id);
}

export async function leaveRoom() {
  if (!state.room) {
    goto('lobby');
    return;
  }
  if (state.viewMode === 'public') {
    state.room = null;
    state.viewMode = 'player';
    goto('lobby');
    toast('已离开公共视角');
    await refreshList(false);
    return;
  }
  if (state.room.status === 'playing') {
    const ok = await askYesNo('离开房间', '对局中离开会空出座位，确定离开？');
    if (!ok) {
      return;
    }
  }
  const data = await request('/api/rooms/' + state.room.id + '/leave', {
    token: state.user.token,
    body: {},
  });
  state.room = null;
  state.myRoom = null;
  state.viewMode = 'player';
  goto('lobby');
  toast(data.dissolved ? '房间已解散' : '已离开房间');
  await refreshList(false);
}

export async function fillBots() {
  if (!state.room) {
    return;
  }
  const data = await request('/api/rooms/' + state.room.id + '/fill-bots', {
    token: state.user.token,
    body: {},
  });
  state.room = data.room;
  state.myRoom = data.room;
  if (data.room.status === 'playing') {
    goto('table');
    toast('已补齐，随机入座');
    return;
  }
  toast('已补齐测试玩家');
}

export async function riichiSeat(targetId) {
  const data = await request('/api/rooms/' + state.room.id + '/riichi', {
    token: state.user.token,
    body: { targetId },
  });
  state.room = data.room;
  toast('立直 -1000');
}

export async function cancelRiichiSeat(targetId) {
  const data = await request('/api/rooms/' + state.room.id + '/cancel-riichi', {
    token: state.user.token,
    body: { targetId },
  });
  state.room = data.room;
  toast('已取消本次立直');
}

export async function startSettle(kind, dealerFlag) {
  const data = await request('/api/rooms/' + state.room.id + '/settle/start', {
    token: state.user.token,
    body: { kind, dealerFlag },
  });
  state.room = data.room;
  toast('已发起本局结算');
}

export async function submitSettle(value) {
  const data = await request('/api/rooms/' + state.room.id + '/settle/submit', {
    token: state.user.token,
    body: { value },
  });
  state.room = data.room;
  const phase = data.room.game && data.room.game.phase;
  if (phase === 'finished') {
    toast('半庄结束');
  } else if (phase === 'playing') {
    toast('对账通过，进入下一局');
  } else if (data.room.game && data.room.game.settle && data.room.game.settle.error) {
    toast(data.room.game.settle.error);
  } else {
    toast('已提交');
  }
}

export async function undoSettle() {
  const ok = await askYesNo('撤销上一局', '将回到上一局开始，该局立直和结算都会作废。');
  if (!ok) {
    return;
  }
  const data = await request('/api/rooms/' + state.room.id + '/undo', {
    token: state.user.token,
    body: {},
  });
  state.room = data.room;
  toast('已撤销上一局');
}

export function runSafe(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      toast(error.message || '操作失败');
    }
  };
}
