<script setup>
import Avatar from '../components/Avatar.vue';
import { STATUS_LABEL } from '../rules.js';
import {
  askRoomCode,
  createRoom,
  enterPublic,
  joinRoom,
  logoutAccount,
  openHistory,
  openRoomFromList,
  refreshList,
  returnToRoom,
  runSafe,
  state,
} from '../state.js';

async function onCreate() {
  if (!state.user.id) {
    return;
  }
  await runSafe(createRoom)();
}

async function onJoin() {
  const code = await askRoomCode('输入房号加入');
  if (code) {
    await runSafe(joinRoom)(code);
  }
}

async function onWatch() {
  const code = await askRoomCode('公共视角 · 输入房号');
  if (code) {
    await runSafe(enterPublic)(code);
  }
}
</script>

<template>
  <section class="screen">
    <header class="header">
      <div>
        <h1>立直麻将 · 风向盘</h1>
        <p>
          <template v-if="state.myRoom">你已在房间 {{ state.myRoom.id }}</template>
          <template v-else>选择或创建一个房间</template>
        </p>
      </div>
      <div class="header-right">
        <button class="ghost-btn small" @click="runSafe(refreshList)(true)">刷新</button>
        <button class="profile" @click="runSafe(logoutAccount)()">
          <Avatar :name="state.user.name" />
          <span>{{ state.user.name || '未登录' }}</span>
          <em>退出登录</em>
        </button>
      </div>
    </header>

    <div class="list">
      <div v-if="!state.rooms.length && !state.myRoom" class="empty">还没有房间，创建一个吧</div>
      <button
        v-for="room in state.rooms"
        :key="room.id"
        class="room-card"
        @click="runSafe(openRoomFromList)(room)"
      >
        <div>
          <strong>房 {{ room.id }}</strong>
          <small>创建者 {{ room.hostName }}</small>
        </div>
        <div class="right">
          <div class="count">{{ room.players.length }}/4</div>
          <span class="pill" :class="room.status">{{ STATUS_LABEL[room.status] }}</span>
        </div>
      </button>
    </div>

    <div class="actions">
      <template v-if="state.myRoom">
        <button class="gold-btn" @click="runSafe(returnToRoom)()">回到房间 {{ state.myRoom.id }}</button>
        <div class="actions row" style="margin-top: 0; padding-top: 0">
          <button class="ghost-btn" @click="onWatch">公共视角</button>
          <button class="ghost-btn" @click="runSafe(openHistory)()">对局记录</button>
        </div>
      </template>
      <template v-else>
        <button class="gold-btn" @click="onCreate">创建房间</button>
        <div class="actions row" style="margin-top: 0; padding-top: 0">
          <button class="ghost-btn" @click="onJoin">输入房号加入</button>
          <button class="ghost-btn" @click="onWatch">公共视角</button>
        </div>
        <button class="ghost-btn gold" @click="runSafe(openHistory)()">对局记录</button>
      </template>
    </div>
  </section>
</template>
