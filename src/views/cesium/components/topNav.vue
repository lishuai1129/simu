<template>
  <header class="top-nav">
    <div class="system-row">
      <div class="clock-panel" aria-label="当前时间">
        <span>{{ currentDate }}</span>
        <strong>{{ currentTime }}</strong>
      </div>

      <div class="system-title">
        <span class="title-line" aria-hidden="true"></span>
        <h1>20所组网运行仿真系统</h1>
        <span class="title-line" aria-hidden="true"></span>
      </div>

      <div class="online-state">
        <span class="online-dot" aria-hidden="true"></span>
        <span>系统状态</span>
        <strong>在线</strong>
      </div>
    </div>

    <div class="command-row">
      <div class="nav-actions">
        <button class="icon-command" type="button" title="返回场景列表" @click="goBack">
          <el-icon :size="17"><Back /></el-icon>
        </button>
      </div>

      <span class="divider" aria-hidden="true"></span>

      <div class="current-scene">
        <span>当前场景：</span>
        <strong :title="sessionName">{{ sessionName }}</strong>
      </div>

      <span class="state-badge" :class="stateClass">
        <span class="state-light" aria-hidden="true"></span>
        {{ stateLabel }}
      </span>

      <span class="divider" aria-hidden="true"></span>

      <div class="runtime-actions">
        <button
          class="runtime-button start-button"
          type="button"
          :disabled="!canStart || Boolean(pendingAction)"
          @click="handleStart"
        >
          <el-icon :size="16" :class="{ 'is-loading': pendingAction === 'start' }">
            <Loading v-if="pendingAction === 'start'" />
            <VideoPlay v-else />
          </el-icon>
          <span>{{ pendingAction === 'start' ? '启动中' : '启动场景' }}</span>
        </button>

        <button
          class="runtime-button stop-button"
          type="button"
          :disabled="!canStop || Boolean(pendingAction)"
          @click="handleStop"
        >
          <el-icon :size="16" :class="{ 'is-loading': pendingAction === 'stop' }">
            <Loading v-if="pendingAction === 'stop'" />
            <VideoPause v-else />
          </el-icon>
          <span>{{ pendingAction === 'stop' ? '停止中' : '停止场景' }}</span>
        </button>
      </div>

      <span class="divider" aria-hidden="true"></span>

      <button class="runtime-button server-button" type="button" @click="serverDialogVisible = true">
        <el-icon :size="16"><Monitor /></el-icon>
        <span>服务器管理</span>
      </button>

      <span class="divider" aria-hidden="true"></span>

      <button
        class="runtime-button ai-button"
        :class="{ active: aiDialogVisible }"
        type="button"
        @click="aiDialogVisible = true"
      >
        <el-icon :size="16"><ChatDotRound /></el-icon>
        <span>AI 助手</span>
        <i v-if="aiStore.streaming" class="ai-live-dot" aria-label="AI 正在生成"></i>
      </button>
    </div>

    <Services v-model="serverDialogVisible" />
    <AiAssistant v-model="aiDialogVisible" />
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import { startSession, stopSession } from '@/api/sessions'
import { useAiStore } from '@/stores/aiServer'
import { useTopoStore } from '@/stores/topo'

import AiAssistant from './AiAssistant.vue'
import Services from './services.vue'

defineOptions({ name: 'CesiumTopNav' })

const router = useRouter()
const topoStore = useTopoStore()
const aiStore = useAiStore()
const now = ref(new Date())
const pendingAction = ref<'start' | 'stop' | null>(null)
const serverDialogVisible = ref(false)
const aiDialogVisible = ref(false)

const clockTimer = window.setInterval(() => {
  now.value = new Date()
}, 1000)

const currentDate = computed(() => {
  const year = now.value.getFullYear()
  const month = String(now.value.getMonth() + 1).padStart(2, '0')
  const day = String(now.value.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
})

const currentTime = computed(() => {
  const hour = String(now.value.getHours()).padStart(2, '0')
  const minute = String(now.value.getMinutes()).padStart(2, '0')
  const second = String(now.value.getSeconds()).padStart(2, '0')
  return `${hour}:${minute}:${second}`
})

const sessionName = computed(() => topoStore.currentSession?.name || '未选择场景')
const sessionState = computed(() => topoStore.currentSession?.state)
const canStart = computed(() => sessionState.value === 'DEFINITION' || sessionState.value === 'SHUTDOWN')
const canStop = computed(() => sessionState.value === 'RUNTIME')

const stateLabel = computed(() => {
  if (sessionState.value === 'RUNTIME') return '运行中'
  if (sessionState.value === 'SHUTDOWN') return '已停止'
  if (sessionState.value === 'DEFINITION') return '定义中'
  return '未连接'
})

const stateClass = computed(() => ({
  'state-runtime': sessionState.value === 'RUNTIME',
  'state-shutdown': sessionState.value === 'SHUTDOWN',
  'state-definition': sessionState.value === 'DEFINITION',
  'state-unknown': !sessionState.value,
}))

async function handleStart() {
  const sessionId = topoStore.currentSessionId
  if (!sessionId || !canStart.value) return

  pendingAction.value = 'start'
  try {
    await startSession(sessionId)
    topoStore.updateSessionState('RUNTIME')
    ElMessage.success('场景启动成功')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '场景启动失败')
  } finally {
    pendingAction.value = null
  }
}

async function handleStop() {
  const sessionId = topoStore.currentSessionId
  if (!sessionId || !canStop.value) return

  try {
    await ElMessageBox.confirm('停止后将释放当前场景的运行资源，确定继续吗？', '停止场景', {
      type: 'warning',
      confirmButtonText: '确认停止',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  pendingAction.value = 'stop'
  try {
    await stopSession(sessionId)
    topoStore.updateSessionState('SHUTDOWN')
    ElMessage.success('场景已停止')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '场景停止失败')
  } finally {
    pendingAction.value = null
  }
}

function goBack() {
  router.push({ name: 'sessions' })
}

onBeforeUnmount(() => {
  window.clearInterval(clockTimer)
})
</script>

<style scoped>
.top-nav {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 30;
  height: 82px;
  overflow: hidden;
  border-bottom: 1px solid rgba(0, 208, 255, 0.5);
  background: rgba(2, 15, 34, 0.94);
  color: #d9efff;
  box-shadow: 0 8px 24px rgba(0, 7, 18, 0.32);
  backdrop-filter: blur(10px);
}

.system-row {
  position: relative;
  height: 43px;
  padding: 0 14px;
  display: grid;
  grid-template-columns: minmax(230px, 1fr) auto minmax(230px, 1fr);
  align-items: center;
  border-bottom: 1px solid rgba(42, 121, 166, 0.32);
}

.clock-panel,
.online-state,
.current-scene,
.runtime-actions,
.nav-actions {
  display: flex;
  align-items: center;
}

.clock-panel {
  gap: 9px;
  font-family: Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0;
}

.clock-panel span {
  color: #65a9cf;
}

.clock-panel strong {
  color: #21d9ff;
  font-size: 13px;
  font-weight: 650;
  text-shadow: 0 0 10px rgba(33, 217, 255, 0.7);
}

.system-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.system-title h1 {
  color: #66dcff;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 5px;
  text-shadow:
    0 0 8px rgba(0, 195, 255, 0.8),
    0 0 20px rgba(0, 195, 255, 0.34);
  white-space: nowrap;
}

.title-line {
  width: 78px;
  height: 1px;
  background: #1689b5;
  box-shadow: 0 0 8px rgba(33, 217, 255, 0.7);
}

.online-state {
  justify-content: flex-end;
  gap: 7px;
  color: #6f9bb7;
  font-size: 12px;
}

.online-state strong {
  color: #36e58b;
  font-weight: 650;
}

.online-dot,
.state-light {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.online-dot {
  color: #36e58b;
}

.command-row {
  height: 38px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(3, 20, 43, 0.88);
}

.icon-command,
.runtime-button {
  border: 1px solid transparent;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #83bbdd;
  font: inherit;
  cursor: pointer;
  transition:
    color 150ms ease,
    border-color 150ms ease,
    background-color 150ms ease;
}

.icon-command {
  width: 28px;
  height: 28px;
}

.icon-command:hover {
  border-color: rgba(56, 189, 248, 0.45);
  background: rgba(14, 113, 158, 0.2);
  color: #d8f5ff;
}

.divider {
  width: 1px;
  height: 20px;
  background: rgba(70, 145, 183, 0.32);
}

.current-scene {
  min-width: 0;
  gap: 5px;
  color: #6e9bb8;
  font-size: 12px;
}

.current-scene strong {
  max-width: 260px;
  overflow: hidden;
  color: #d9efff;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-badge {
  height: 24px;
  padding: 0 9px;
  border: 1px solid currentColor;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
}

.state-runtime {
  background: rgba(27, 166, 97, 0.13);
  color: #42e795;
}

.state-shutdown {
  background: rgba(218, 73, 73, 0.13);
  color: #ff7c74;
}

.state-definition {
  background: rgba(48, 151, 209, 0.14);
  color: #65c9ff;
}

.state-unknown {
  background: rgba(132, 151, 164, 0.12);
  color: #93a8b5;
}

.runtime-actions {
  gap: 8px;
}

.runtime-button {
  height: 28px;
  padding: 0 10px;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.start-button {
  border-color: rgba(52, 211, 153, 0.45);
  color: #55e7a6;
}

.start-button:hover:not(:disabled) {
  background: rgba(31, 171, 108, 0.18);
  border-color: #55e7a6;
}

.stop-button {
  border-color: rgba(248, 113, 113, 0.42);
  color: #ff8e86;
}

.stop-button:hover:not(:disabled) {
  background: rgba(205, 66, 66, 0.17);
  border-color: #ff8e86;
}

.server-button {
  border-color: rgba(67, 178, 229, 0.45);
  color: #70d6ff;
}

.server-button:hover {
  border-color: #70d6ff;
  background: rgba(32, 133, 181, 0.2);
}

.ai-button {
  position: relative;
  border-color: rgba(73, 203, 230, 0.45);
  color: #73e5fa;
}

.ai-button:hover,
.ai-button.active {
  border-color: #73e5fa;
  background: rgba(28, 129, 156, 0.22);
}

.ai-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #50e49a;
  box-shadow: 0 0 8px #50e49a;
  animation: ai-pulse 1s ease-in-out infinite;
}

.runtime-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

@keyframes ai-pulse {
  50% {
    opacity: 0.35;
  }
}

@media (max-width: 900px) {
  .system-row {
    grid-template-columns: 1fr auto 1fr;
  }

  .title-line,
  .clock-panel span,
  .online-state span:not(.online-dot) {
    display: none;
  }

  .system-title h1 {
    font-size: 17px;
    letter-spacing: 2px;
  }
}

@media (max-width: 620px) {
  .top-nav {
    height: 88px;
  }

  .system-row {
    height: 42px;
    grid-template-columns: 74px 1fr 24px;
  }

  .clock-panel strong {
    font-size: 10px;
  }

  .system-title {
    justify-content: center;
  }

  .system-title h1 {
    font-size: 14px;
  }

  .online-state strong {
    display: none;
  }

  .command-row {
    height: 45px;
    gap: 7px;
    overflow-x: auto;
  }

  .current-scene strong {
    max-width: 110px;
  }

  .runtime-button span {
    display: none;
  }

  .runtime-button {
    width: 30px;
    padding: 0;
  }
}
</style>
