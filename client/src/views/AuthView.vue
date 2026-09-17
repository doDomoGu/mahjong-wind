<script setup>
import { ref } from 'vue';
import { loginAccount, registerAccount, runSafe, toast } from '../state.js';

const mode = ref('login');
const name = ref('');
const password = ref('');
const confirm = ref('');

function switchMode(next) {
  mode.value = next;
  password.value = '';
  confirm.value = '';
}

async function submit() {
  const account = name.value.trim();
  if (account.length < 2) {
    toast('账号至少 2 个字');
    return;
  }
  if (password.value.length < 4) {
    toast('密码至少 4 位');
    return;
  }
  if (mode.value === 'register') {
    if (password.value !== confirm.value) {
      toast('两次密码不一致');
      return;
    }
    await runSafe(registerAccount)(account, password.value);
    return;
  }
  await runSafe(loginAccount)(account, password.value);
}
</script>

<template>
  <section class="screen auth-screen">
    <div class="auth-brand">
      <img src="/icon-144.png" alt="" class="auth-icon" />
      <h1>立直麻将 · 风向盘</h1>
      <p>账号就是桌上显示的昵称</p>
    </div>

    <div class="auth-tabs">
      <button :class="{ on: mode === 'login' }" @click="switchMode('login')">登录</button>
      <button :class="{ on: mode === 'register' }" @click="switchMode('register')">注册</button>
    </div>

    <form class="auth-form" @submit.prevent="submit">
      <label>
        账号
        <input v-model="name" maxlength="12" autocomplete="username" placeholder="2–12 个字，也是昵称" />
      </label>
      <label>
        密码
        <input
          v-model="password"
          type="password"
          maxlength="32"
          autocomplete="current-password"
          placeholder="至少 4 位"
        />
      </label>
      <label v-if="mode === 'register'">
        确认密码
        <input
          v-model="confirm"
          type="password"
          maxlength="32"
          autocomplete="new-password"
          placeholder="再输入一次"
        />
      </label>
      <button class="gold-btn" type="submit">
        {{ mode === 'login' ? '登录进入大厅' : '注册并进入' }}
      </button>
    </form>
  </section>
</template>
