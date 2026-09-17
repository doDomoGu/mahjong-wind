<script setup>
defineProps({
  name: { type: String, default: '?' },
  size: { type: String, default: '' },
});
</script>

<template>
  <div class="avatar" :class="size">{{ (name || '?').slice(0, 1) }}</div>
</template>
