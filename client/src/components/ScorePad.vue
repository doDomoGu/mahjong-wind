<script setup>
import { ref, watch } from 'vue';
import { closeScorePad, state } from '../state.js';
import { formatDelta } from '../rules.js';

const raw = ref('');
const negative = ref(false);
const chips = [1000, 1500, 2000, 3000, 4000, 8000];

watch(() => state.scorePad.visible, (visible) => {
  if (visible) {
    raw.value = '';
    negative.value = false;
  }
});

function current() {
  const n = Number(raw.value || 0);
  return negative.value ? -n : n;
}

function press(key) {
  if (key === 'del') {
    raw.value = raw.value.slice(0, -1);
    return;
  }
  if (key === 'sign') {
    negative.value = !negative.value;
    return;
  }
  if (raw.value.length >= 6) {
    return;
  }
  raw.value += key;
}

function applyChip(value) {
  raw.value = String(Math.abs(value));
  negative.value = value < 0;
}

function confirm() {
  closeScorePad(current());
}
</script>

<template>
  <div v-if="state.scorePad.visible" class="overlay" @click.self="closeScorePad(null)">
    <div class="modal">
      <h3>本局点数变化</h3>
      <p class="hint" style="margin-top: -8px">不含局中已经扣过的立直 1000</p>
      <div class="pad-display">{{ formatDelta(current()) }}</div>
      <div class="chips">
        <button v-for="n in chips" :key="'p'+n" @click="applyChip(n)">+{{ n }}</button>
        <button v-for="n in chips.slice(0, 4)" :key="'m'+n" @click="applyChip(-n)">-{{ n }}</button>
      </div>
      <div class="pad-grid">
        <button v-for="n in 9" :key="n" @click="press(String(n))">{{ n }}</button>
        <button @click="press('sign')">+/-</button>
        <button @click="press('0')">0</button>
        <button @click="press('del')">删除</button>
      </div>
      <div class="stack" style="margin-top: 12px">
        <button class="gold-btn" @click="confirm">确认提交</button>
        <button class="ghost-btn" @click="closeScorePad(0)">无变化</button>
        <button class="ghost-btn" @click="closeScorePad(null)">取消</button>
      </div>
    </div>
  </div>
</template>
