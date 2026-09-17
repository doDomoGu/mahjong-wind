<script setup>
import { computed } from 'vue';
import Avatar from '../components/Avatar.vue';
import { fillBots, leaveRoom, refreshCurrent, runSafe, state } from '../state.js';

const slots = computed(() => {
  const players = (state.room && state.room.players) || [];
  return [0, 1, 2, 3].map((index) => players[index] || null);
});

const need = computed(() => Math.max(0, 4 - ((state.room && state.room.players.length) || 0)));
</script>

<template>
  <section class="screen" v-if="state.room">
    <header class="header">
      <div>
        <h1>等待开局</h1>
        <p>房号 {{ state.room.id }}  ·  {{ state.room.players.length }}/4</p>
      </div>
      <button class="ghost-btn small" @click="runSafe(refreshCurrent)(true)">刷新</button>
    </header>

    <div class="slots">
      <div v-for="(player, index) in slots" :key="index" class="slot-card">
        <template v-if="player">
          <Avatar :name="player.name" size="lg" />
          <div class="name">{{ player.name }}</div>
          <div v-if="player.id === state.room.hostId" class="role">房主</div>
        </template>
        <div v-else class="name" style="color: var(--muted)">空位</div>
      </div>
    </div>

    <p class="hint">满 4 人后随机入座并自动开局</p>

    <div class="actions">
      <button
        v-if="need > 0 && state.room.status === 'waiting'"
        class="ghost-btn gold"
        @click="runSafe(fillBots)()"
      >
        调试：补齐测试玩家（差 {{ need }} 人）
      </button>
      <button class="danger-btn" @click="runSafe(leaveRoom)()">离开房间</button>
    </div>
  </section>
</template>
