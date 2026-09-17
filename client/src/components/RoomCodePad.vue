<script setup>
import { ref, watch } from 'vue';
import { closeRoomPad, state } from '../state.js';

const digits = ref('');

watch(() => state.roomPad.visible, (visible) => {
  if (visible) {
    digits.value = '';
  }
});

function press(key) {
  if (key === 'del') {
    digits.value = digits.value.slice(0, -1);
    return;
  }
  if (digits.value.length >= 4) {
    return;
  }
  digits.value += key;
  if (digits.value.length === 4) {
    closeRoomPad(digits.value);
  }
}
</script>

<template>
  <div v-if="state.roomPad.visible" class="overlay" @click.self="closeRoomPad('')">
    <div class="modal">
      <h3>{{ state.roomPad.title }}</h3>
      <div class="pad-display">{{ digits.padEnd(4, '·') }}</div>
      <div class="pad-grid">
        <button v-for="n in 9" :key="n" @click="press(String(n))">{{ n }}</button>
        <button @click="closeRoomPad('')">取消</button>
        <button @click="press('0')">0</button>
        <button @click="press('del')">删除</button>
      </div>
    </div>
  </div>
</template>
