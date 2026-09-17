<script setup>
import { closeConfirm, state } from '../state.js';
</script>

<template>
  <div v-if="state.confirm.visible" class="overlay" @click.self="closeConfirm(false)">
    <div class="modal">
      <h3>{{ state.confirm.title }}</h3>
      <p class="hint" style="margin-top: 0">{{ state.confirm.message }}</p>
      <div class="stack">
        <button class="gold-btn" @click="closeConfirm(true)">确定</button>
        <button class="ghost-btn" @click="closeConfirm(false)">取消</button>
      </div>
    </div>
  </div>
</template>
