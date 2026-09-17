<script setup>
import { computed } from 'vue';
import { WIND_LABEL, formatPt, formatTime } from '../rules.js';
import { goto, refreshHistory, runSafe, state } from '../state.js';

const mineId = computed(() => state.user.id);

function mineRow(match) {
  return (match.results || []).find((row) => row.id === mineId.value) || null;
}
</script>

<template>
  <section class="screen">
    <header class="header">
      <div>
        <h1>对局记录</h1>
        <p>{{ state.user.name }} 的半庄战绩</p>
      </div>
      <button class="ghost-btn small" @click="runSafe(refreshHistory)()">刷新</button>
    </header>

    <div class="list">
      <div v-if="!state.history.length" class="empty">还没有打完的半庄</div>
      <article v-for="match in state.history" :key="match.id" class="history-card">
        <div class="history-top">
          <strong>房 {{ match.roomId }}</strong>
          <span>{{ formatTime(match.finishedAt) }}</span>
        </div>
        <div v-if="mineRow(match)" class="history-mine">
          第 {{ mineRow(match).rank }} 名 · {{ mineRow(match).score }} · {{ formatPt(mineRow(match).pt) }} pt
        </div>
        <div class="history-rows">
          <div v-for="row in match.results" :key="row.id" class="history-row" :class="{ me: row.id === mineId }">
            <span class="rank" :class="{ first: row.rank === 1 }">{{ row.rank }}</span>
            <span>{{ WIND_LABEL[row.wind] || '' }} {{ row.name }}</span>
            <span>{{ row.score }}</span>
            <span class="pt">{{ formatPt(row.pt) }}</span>
          </div>
        </div>
      </article>
    </div>

    <div class="actions">
      <button class="gold-btn" @click="goto('lobby')">回大厅</button>
    </div>
  </section>
</template>
