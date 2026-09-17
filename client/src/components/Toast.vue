<script setup>
import { state } from '../state.js';
</script>

<template>
  <div v-if="state.toast" class="toast">{{ state.toast }}</div>
</template>
