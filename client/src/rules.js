export const WIND_ORDER = ['E', 'S', 'W', 'N'];
export const WIND_LABEL = { E: '东', S: '南', W: '西', N: '北' };

export const STATUS_LABEL = {
  waiting: '等待中',
  playing: '对局中',
  finished: '已终局',
};

export function playerWind(seats, playerId) {
  if (!seats || !playerId) {
    return null;
  }
  return WIND_ORDER.find((wind) => seats[wind] === playerId) || null;
}

export function formatRound(game) {
  if (!game) {
    return '东 1';
  }
  return WIND_LABEL[game.roundWind] + ' ' + game.kyoku;
}

export function formatDelta(value) {
  const n = Number(value) || 0;
  if (n > 0) {
    return '+' + n;
  }
  return String(n);
}

export function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (n) => String(n).padStart(2, '0');
  return date.getFullYear()
    + '-' + pad(date.getMonth() + 1)
    + '-' + pad(date.getDate())
    + ' '
    + pad(date.getHours())
    + ':' + pad(date.getMinutes());
}

export function formatPt(pt) {
  const n = Number(pt) || 0;
  const sign = n > 0 ? '+' : '';
  const rounded = Math.round(n * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
    return sign + String(Math.round(rounded));
  }
  return sign + rounded.toFixed(1);
}

export function layoutWinds(viewMode, myWind) {
  if (viewMode === 'public' || !myWind) {
    return { bottom: 'E', right: 'S', top: 'W', left: 'N' };
  }
  const index = WIND_ORDER.indexOf(myWind);
  const at = (offset) => WIND_ORDER[(index + offset + 4) % 4];
  return {
    bottom: at(0),
    right: at(1),
    top: at(2),
    left: at(3),
  };
}

export function settleSummary(game) {
  if (!game || !game.settle) {
    return '';
  }
  let text = '';
  if (game.settle.kind === 'win') {
    text = game.settle.dealerFlag ? '有人和牌 · 亲家' : '有人和牌 · 子家';
  } else {
    text = game.settle.dealerFlag ? '流局 · 亲家听牌' : '流局 · 亲家不听';
  }
  if (game.settle.scenario) {
    text += ' · ' + game.settle.scenario;
  }
  return text;
}

export function canUndo(game) {
  return !!(game && game.history && game.history.length > 1);
}

export function playerOf(room, id) {
  return ((room && room.players) || []).find((item) => item.id === id) || null;
}
