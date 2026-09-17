<script setup>
import { onMounted } from 'vue';
import { boot, state } from './state.js';
import AuthView from './views/AuthView.vue';
import HistoryView from './views/HistoryView.vue';
import LobbyView from './views/LobbyView.vue';
import WaitingView from './views/WaitingView.vue';
import TableView from './views/TableView.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import RoomCodePad from './components/RoomCodePad.vue';
import ScorePad from './components/ScorePad.vue';
import SettleWizard from './components/SettleWizard.vue';
import Toast from './components/Toast.vue';

onMounted(() => {
  boot();
});
</script>

<template>
  <div class="app-shell">
    <div class="phone">
      <AuthView v-if="state.screen === 'auth'" />
      <LobbyView v-else-if="state.screen === 'lobby'" />
      <HistoryView v-else-if="state.screen === 'history'" />
      <WaitingView v-else-if="state.screen === 'waiting'" />
      <TableView v-else-if="state.screen === 'table'" />
    </div>
    <ConfirmDialog />
    <RoomCodePad />
    <ScorePad />
    <SettleWizard />
    <Toast />
  </div>
</template>
