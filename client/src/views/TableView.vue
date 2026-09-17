<script setup>
import { computed } from 'vue';
import Avatar from '../components/Avatar.vue';
import {
  WIND_LABEL,
  canUndo,
  formatDelta,
  formatPt,
  formatRound,
  layoutWinds,
  playerOf,
  playerWind,
  settleSummary,
} from '../rules.js';
import {
  askDelta,
  askYesNo,
  cancelRiichiSeat,
  leaveRoom,
  refreshCurrent,
  riichiSeat,
  runSafe,
  state,
  submitSettle,
  undoSettle,
} from '../state.js';

const REL_LABEL = {
  bottom: '自己',
  right: '下家',
  top: '对家',
  left: '上家',
};

const isPublic = computed(() => state.viewMode === 'public');
const room = computed(() => state.room);
const game = computed(() => room.value && room.value.game);
const myWind = computed(() => playerWind(room.value && room.value.seats, state.user.id));
const winds = computed(() => layoutWinds(state.viewMode, myWind.value));
const seated = computed(() => {
  return !!(room.value && room.value.seats && Object.values(room.value.seats).includes(state.user.id));
});
const acting = computed(() => !isPublic.value && seated.value && game.value && game.value.phase !== 'finished');
const showResults = computed(() => game.value && game.value.phase === 'finished');
const withRiichi = computed(() => acting.value && game.value && game.value.phase === 'playing');

const sides = computed(() => {
  return ['top', 'left', 'right', 'bottom'].map((side) => ({
    side,
    wind: winds.value[side],
  }));
});

function seatInfo(side) {
  const playerId = room.value.seats ? room.value.seats[side.wind] : null;
  const player = playerOf(room.value, playerId);
  const mine = playerId === state.user.id;
  const rawScore = playerId && game.value.scores ? game.value.scores[playerId] : null;
  const myScore = game.value.scores ? game.value.scores[state.user.id] : null;
  const useDiff = state.scoreMode === 'diff' && !mine && rawScore != null && myScore != null;
  const input = game.value.settle && playerId ? game.value.settle.inputs[playerId] : null;
  return {
    playerId,
    player,
    mine,
    isDealer: game.value.dealerWind === side.wind,
    reached: !!(playerId && game.value.riichi && game.value.riichi[playerId]),
    scoreText: rawScore == null ? '—' : (useDiff ? formatDelta(rawScore - myScore) : String(rawScore)),
    scoreClass: useDiff
      ? (rawScore > myScore ? 'up' : rawScore < myScore ? 'down' : 'same')
      : '',
    input,
  };
}

const results = computed(() => (game.value && game.value.results) || []);

const mineInput = computed(() => {
  return game.value && game.value.settle && game.value.settle.inputs[state.user.id];
});

const hint = computed(() => {
  if (!game.value) {
    return '';
  }
  if (game.value.phase === 'settling' && game.value.settle) {
    return game.value.settle.error || settleSummary(game.value);
  }
  if (acting.value && game.value.phase === 'playing') {
    return state.scoreMode === 'diff' ? '点中间风盘回到点数' : '点右侧立直；点中间风盘看分差';
  }
  if (isPublic.value) {
    return '只读，不占座';
  }
  return '';
});

function toggleScore() {
  if (isPublic.value || !seated.value || showResults.value) {
    return;
  }
  state.scoreMode = state.scoreMode === 'diff' ? 'absolute' : 'diff';
}

function openWizard() {
  state.wizard.visible = true;
  state.wizard.step = 'kind';
}

async function onRiichi() {
  const info = seatInfo({ wind: winds.value.bottom, side: 'bottom' });
  if (!info.playerId) {
    return;
  }
  if (info.reached) {
    const ok = await askYesNo('取消本次立直', '把 1000 从供托还回去。');
    if (ok) {
      await runSafe(cancelRiichiSeat)(info.playerId);
    }
    return;
  }
  const ok = await askYesNo('立直', '立刻 −1000，供托 +1000。');
  if (ok) {
    await runSafe(riichiSeat)(info.playerId);
  }
}

async function onFill() {
  if (mineInput.value && !mineInput.value.confirmed && mineInput.value.suggested) {
    await runSafe(submitSettle)(mineInput.value.suggested);
    return;
  }
  const value = await askDelta();
  if (value == null) {
    return;
  }
  await runSafe(submitSettle)(value);
}

async function onLeave() {
  if (isPublic.value) {
    await runSafe(leaveRoom)();
    return;
  }
  await runSafe(leaveRoom)();
}
</script>

<template>
  <section class="screen" v-if="room">
    <header class="header">
      <div>
        <h1>{{ isPublic ? '公共视角' : '个人风向盘' }}</h1>
        <p>房 {{ room.id }}</p>
      </div>
      <button class="ghost-btn small" @click="runSafe(refreshCurrent)(true)">刷新</button>
    </header>

    <template v-if="!game">
      <div class="empty">对局尚未开始</div>
    </template>

    <template v-else-if="showResults">
      <div class="results">
        <h2>半庄结束</h2>
        <div v-for="row in results" :key="row.id" class="result-row">
          <span class="rank" :class="{ first: row.rank === 1 }">{{ row.rank }}</span>
          <span>{{ playerOf(room, row.id) ? playerOf(room, row.id).name : row.id }}</span>
          <span>{{ row.score }}</span>
          <span class="pt">{{ formatPt(row.pt) }} pt</span>
        </div>
      </div>
    </template>

    <div v-else class="board">
      <div
        v-for="side in sides.filter((item) => item.side !== 'bottom')"
        :key="side.side"
        class="seat-card"
        :class="[ 'seat-' + side.side, { mine: seatInfo(side).mine, riichi: seatInfo(side).reached } ]"
      >
        <Avatar :name="seatInfo(side).player ? seatInfo(side).player.name : '空'" />
        <div class="wind" :class="{ dealer: seatInfo(side).isDealer }">
          {{ WIND_LABEL[side.wind] }}{{ seatInfo(side).isDealer ? '亲' : '' }}{{ isPublic ? '' : ' · ' + REL_LABEL[side.side] }}
        </div>
        <div class="name">{{ seatInfo(side).player ? seatInfo(side).player.name : '空' }}</div>
        <div class="score" :class="seatInfo(side).scoreClass">{{ seatInfo(side).scoreText }}</div>
        <span v-if="seatInfo(side).input && seatInfo(side).input.confirmed" class="mark ok">
          {{ formatDelta(seatInfo(side).input.value) }}
        </span>
        <span v-else-if="game.phase === 'settling' && seatInfo(side).playerId" class="mark wait">未交</span>
      </div>

      <div class="disk-wrap">
        <button class="disk" @click="toggleScore">
          <strong>{{ formatRound(game) }}</strong>
          <small>本场 {{ game.honba }}  ·  供托 {{ game.kyotaku }}</small>
          <em>亲 {{ WIND_LABEL[game.dealerWind] }}{{ !isPublic && seated && !showResults ? ' · ' + (state.scoreMode === 'diff' ? '分差' : '点数') : '' }}</em>
        </button>
      </div>

      <div class="bottom-row">
        <div
          class="seat-card"
          :class="{ mine: seatInfo({ side: 'bottom', wind: winds.bottom }).mine, riichi: seatInfo({ side: 'bottom', wind: winds.bottom }).reached }"
        >
          <Avatar :name="seatInfo({ side: 'bottom', wind: winds.bottom }).player ? seatInfo({ side: 'bottom', wind: winds.bottom }).player.name : '空'" />
          <div class="wind" :class="{ dealer: seatInfo({ side: 'bottom', wind: winds.bottom }).isDealer }">
            {{ WIND_LABEL[winds.bottom] }}{{ seatInfo({ side: 'bottom', wind: winds.bottom }).isDealer ? '亲' : '' }}{{ isPublic ? '' : ' · 自己' }}
          </div>
          <div class="name">{{ seatInfo({ side: 'bottom', wind: winds.bottom }).player ? seatInfo({ side: 'bottom', wind: winds.bottom }).player.name : '空' }}</div>
          <div class="score">{{ seatInfo({ side: 'bottom', wind: winds.bottom }).scoreText }}</div>
          <span v-if="seatInfo({ side: 'bottom', wind: winds.bottom }).input && seatInfo({ side: 'bottom', wind: winds.bottom }).input.confirmed" class="mark ok">
            {{ formatDelta(seatInfo({ side: 'bottom', wind: winds.bottom }).input.value) }}
          </span>
          <span v-else-if="game.phase === 'settling' && seatInfo({ side: 'bottom', wind: winds.bottom }).playerId" class="mark wait">未交</span>
        </div>
        <button
          v-if="withRiichi"
          class="riichi-btn"
          :class="seatInfo({ side: 'bottom', wind: winds.bottom }).reached ? 'ghost-btn gold' : 'gold-btn'"
          @click="onRiichi"
        >
          {{ seatInfo({ side: 'bottom', wind: winds.bottom }).reached ? '取消' : '立直' }}
        </button>
      </div>
    </div>

    <p class="hint" :class="{ error: game && game.settle && game.settle.error }">{{ hint }}</p>

    <div class="actions">
      <div v-if="showResults && canUndo(game) && !isPublic && seated" class="actions row" style="margin-top: 0">
        <button class="ghost-btn" @click="runSafe(undoSettle)()">撤销上一局</button>
      </div>
      <div v-else-if="acting && game.phase === 'playing'" class="actions row" style="margin-top: 0">
        <button class="gold-btn" @click="openWizard">发起结算</button>
        <button v-if="canUndo(game)" class="ghost-btn" @click="runSafe(undoSettle)()">撤销上一局</button>
        <button v-else class="ghost-btn" disabled>东 1 开局</button>
      </div>
      <div v-else-if="acting && game.phase === 'settling'" class="actions row" style="margin-top: 0">
        <button class="ghost-btn" @click="runSafe(submitSettle)(0)">无变化</button>
        <button class="gold-btn" @click="onFill">
          <template v-if="mineInput && mineInput.confirmed">改自己的分</template>
          <template v-else-if="mineInput && mineInput.suggested">采用 {{ formatDelta(mineInput.suggested) }}</template>
          <template v-else>填写自己的分</template>
        </button>
      </div>
      <button class="danger-btn" @click="onLeave">
        {{ isPublic ? '离开公共视角' : (showResults ? '回大厅' : '离开房间') }}
      </button>
    </div>
  </section>
</template>
