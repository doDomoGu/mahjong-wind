<script setup>
import { computed } from 'vue';
import { runSafe, startSettle, state } from '../state.js';

const dealerLocked = computed(() => {
  const room = state.room;
  const game = room && room.game;
  const dealerId = room && room.seats && game ? room.seats[game.dealerWind] : null;
  return !!(dealerId && game && game.riichi && game.riichi[dealerId]);
});

function close() {
  state.wizard.visible = false;
  state.wizard.step = 'kind';
  state.wizard.kind = null;
}

function pickKind(kind) {
  if (kind === 'draw' && dealerLocked.value) {
    close();
    runSafe(startSettle)('draw', true);
    return;
  }
  state.wizard.step = 'flag';
  state.wizard.kind = kind;
}

function pickFlag(flag) {
  if (state.wizard.kind === 'draw' && dealerLocked.value && !flag) {
    return;
  }
  const kind = state.wizard.kind;
  close();
  runSafe(startSettle)(kind, flag);
}

function back() {
  if (state.wizard.step === 'flag') {
    state.wizard.step = 'kind';
    return;
  }
  close();
}
</script>

<template>
  <div v-if="state.wizard.visible" class="overlay" @click.self="close">
    <div class="modal">
      <template v-if="state.wizard.step === 'kind'">
        <h3>本局如何结束？</h3>
        <div class="stack">
          <button class="gold-btn" @click="pickKind('win')">有人和牌</button>
          <button class="ghost-btn" @click="pickKind('draw')">流局</button>
          <button class="ghost-btn" @click="close">取消</button>
        </div>
      </template>
      <template v-else>
        <h3>{{ state.wizard.kind === 'win' ? '和牌的人是亲家吗？' : '亲家是否听牌？' }}</h3>
        <p v-if="state.wizard.kind === 'draw' && dealerLocked" class="sub">亲家本局已立直，锁定听牌</p>
        <div class="stack">
          <button class="gold-btn" @click="pickFlag(true)">
            {{ state.wizard.kind === 'win' ? '亲家和了' : '亲家听牌' }}
          </button>
          <button
            class="ghost-btn"
            :disabled="state.wizard.kind === 'draw' && dealerLocked"
            @click="pickFlag(false)"
          >
            {{ state.wizard.kind === 'draw' && dealerLocked ? '已锁定' : (state.wizard.kind === 'win' ? '子家和了' : '亲家不听') }}
          </button>
          <button class="ghost-btn" @click="back">返回</button>
        </div>
      </template>
    </div>
  </div>
</template>
