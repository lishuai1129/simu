<template>
  <Teleport to="body">
    <Transition name="ai-panel">
      <div v-if="visible" class="ai-layer">
        <button class="panel-backdrop" type="button" aria-label="关闭 AI 助手" @click="visible = false"></button>
        <aside class="ai-panel" aria-label="AI 仿真助手">
          <header class="panel-header">
            <span class="assistant-mark"><Bot :size="20" /></span>
            <div class="header-copy">
              <strong>AI 仿真助手</strong>
              <span>{{ aiStore.streaming ? '正在处理任务' : `会话 ${conversationSuffix}` }}</span>
            </div>
            <button
              class="icon-button"
              type="button"
              title="清除对话历史"
              :disabled="aiStore.clearing"
              @click="confirmClearHistory"
            >
              <LoaderCircle v-if="aiStore.clearing" :size="17" class="spinning" />
              <Trash2 v-else :size="17" />
            </button>
            <button class="icon-button" type="button" title="关闭" @click="visible = false">
              <X :size="18" />
            </button>
          </header>

          <div ref="messageContainer" class="message-area">
            <div v-if="!aiStore.messages.length" class="empty-conversation">
              <span class="empty-icon"><Sparkles :size="26" /></span>
              <strong>有什么需要处理？</strong>
              <div class="prompt-list">
                <button v-for="prompt in suggestedPrompts" :key="prompt" type="button" @click="usePrompt(prompt)">
                  {{ prompt }}
                  <ChevronRight :size="15" />
                </button>
              </div>
            </div>

            <article
              v-for="message in aiStore.messages"
              :key="message.id"
              class="message"
              :class="[message.role, message.state]"
            >
              <span class="message-avatar">
                <UserRound v-if="message.role === 'user'" :size="15" />
                <Bot v-else :size="16" />
              </span>
              <div class="message-body">
                <span class="message-author">{{ message.role === 'user' ? '我' : 'AI 助手' }}</span>
                <p>{{ message.content }}<span v-if="message.state === 'streaming'" class="stream-caret"></span></p>
              </div>
            </article>
          </div>

          <footer class="composer">
            <div v-if="aiStore.lastError" class="request-error">
              <CircleAlert :size="14" />
              <span>{{ aiStore.lastError }}</span>
            </div>
            <div class="input-shell">
              <textarea
                v-model="draft"
                rows="2"
                maxlength="2000"
                placeholder="输入仿真任务..."
                :disabled="aiStore.streaming"
                @keydown="handleComposerKeydown"
              ></textarea>
              <button
                v-if="aiStore.streaming"
                class="send-button stop-generating"
                type="button"
                title="停止生成"
                @click="aiStore.stopStreaming"
              >
                <Square :size="15" fill="currentColor" />
              </button>
              <button
                v-else
                class="send-button"
                type="button"
                title="发送"
                :disabled="!draft.trim()"
                @click="submitMessage"
              >
                <Send :size="17" />
              </button>
            </div>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Bot,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  Send,
  Sparkles,
  Square,
  Trash2,
  UserRound,
  X,
} from 'lucide-vue-next'

import { getSession } from '@/api/sessions'
import { useAiStore } from '@/stores/aiServer'
import { useTopoStore } from '@/stores/topo'

defineOptions({ name: 'AiAssistant' })

const visible = defineModel<boolean>({ default: false })
const aiStore = useAiStore()
const topoStore = useTopoStore()
const draft = ref('')
const messageContainer = ref<HTMLElement | null>(null)

const suggestedPrompts = [
  '查看当前场景的节点和链路',
  '检查当前场景拓扑配置',
  '列出当前可用服务器',
]

const conversationSuffix = computed(() => aiStore.conversationId.slice(-8))
const latestMessageContent = computed(
  () => aiStore.messages[aiStore.messages.length - 1]?.content ?? '',
)

async function scrollToBottom() {
  await nextTick()
  const container = messageContainer.value
  if (container) container.scrollTop = container.scrollHeight
}

function usePrompt(prompt: string) {
  draft.value = prompt
  void submitMessage()
}

async function refreshCurrentScene() {
  const sessionId = topoStore.currentSessionId
  if (!sessionId) return
  await Promise.allSettled([
    getSession(sessionId).then((session) => topoStore.selectSession(session)),
    topoStore.fetchNodes(),
    topoStore.fetchLinks(),
  ])
}

async function submitMessage() {
  const message = draft.value.trim()
  if (!message || aiStore.streaming) return
  draft.value = ''
  await scrollToBottom()

  try {
    await aiStore.sendMessage(message)
    await refreshCurrentScene()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'AI 对话请求失败')
  }
}

function handleComposerKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  void submitMessage()
}

async function confirmClearHistory() {
  try {
    await ElMessageBox.confirm('确定清除当前 AI 会话的全部对话记录吗？', '清除对话', {
      type: 'warning',
      confirmButtonText: '确认清除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  try {
    await aiStore.clearHistory()
    ElMessage.success('AI 对话历史已清除')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '清除对话历史失败')
  }
}

watch([visible, latestMessageContent, () => aiStore.streaming], () => {
  if (visible.value) void scrollToBottom()
})
</script>

<style scoped>
.ai-layer {
  position: fixed;
  inset: 0;
  z-index: 2100;
}

.panel-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: rgba(0, 7, 14, 0.42);
  backdrop-filter: blur(2px);
  cursor: default;
}

.ai-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(440px, 100vw);
  border-left: 1px solid rgba(48, 193, 231, 0.5);
  display: grid;
  grid-template-rows: 68px minmax(0, 1fr) auto;
  background: #061523;
  color: #cfe8f4;
  box-shadow: -18px 0 55px rgba(0, 4, 10, 0.58);
}

.panel-header {
  padding: 0 14px 0 16px;
  border-bottom: 1px solid rgba(48, 142, 180, 0.32);
  display: flex;
  align-items: center;
  gap: 9px;
  background: #04111e;
}

.assistant-mark,
.empty-icon,
.message-avatar {
  display: grid;
  place-items: center;
}

.assistant-mark {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border: 1px solid rgba(54, 206, 241, 0.52);
  border-radius: 6px;
  background: rgba(10, 91, 125, 0.34);
  color: #5fe2ff;
  box-shadow: inset 0 0 13px rgba(47, 201, 235, 0.11);
}

.header-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-copy strong {
  color: #e0f4fb;
  font-size: 14px;
  font-weight: 650;
}

.header-copy span {
  color: #527e92;
  font-family: Consolas, monospace;
  font-size: 9px;
}

.icon-button,
.send-button {
  padding: 0;
  border: 1px solid transparent;
  display: grid;
  place-items: center;
  background: transparent;
  color: #719aad;
  cursor: pointer;
}

.icon-button {
  width: 30px;
  height: 30px;
  border-radius: 4px;
}

.icon-button:hover:not(:disabled) {
  border-color: rgba(75, 186, 224, 0.42);
  background: rgba(15, 79, 106, 0.3);
  color: #c5effb;
}

.icon-button:disabled {
  cursor: wait;
  opacity: 0.5;
}

.message-area {
  padding: 18px 16px 22px;
  overflow-y: auto;
  scrollbar-color: #166a89 #061523;
  scrollbar-width: thin;
}

.empty-conversation {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #789bad;
}

.empty-icon {
  width: 50px;
  height: 50px;
  margin-bottom: 13px;
  border: 1px solid rgba(55, 196, 229, 0.4);
  border-radius: 7px;
  background: rgba(9, 71, 98, 0.3);
  color: #5bdcf9;
  box-shadow: 0 0 24px rgba(42, 181, 216, 0.12);
}

.empty-conversation > strong {
  margin-bottom: 18px;
  color: #cce8f3;
  font-size: 15px;
  font-weight: 600;
}

.prompt-list {
  width: min(330px, 100%);
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.prompt-list button {
  min-height: 38px;
  padding: 0 11px;
  border: 1px solid rgba(51, 129, 161, 0.32);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(5, 29, 47, 0.72);
  color: #8eb7c8;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.prompt-list button:hover {
  border-color: rgba(60, 202, 235, 0.62);
  background: rgba(9, 61, 83, 0.68);
  color: #d0f2fb;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.message + .message {
  margin-top: 20px;
}

.message-avatar {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  border: 1px solid rgba(53, 151, 190, 0.38);
  border-radius: 5px;
  background: rgba(9, 53, 75, 0.58);
  color: #65d9f5;
}

.message.user .message-avatar {
  border-color: rgba(65, 205, 147, 0.38);
  background: rgba(18, 96, 66, 0.28);
  color: #69e1a9;
}

.message-body {
  min-width: 0;
  flex: 1;
}

.message-author {
  display: block;
  margin-bottom: 5px;
  color: #688fa2;
  font-size: 9px;
}

.message-body p {
  color: #c6dee8;
  font-family: Consolas, 'Microsoft YaHei', monospace;
  font-size: 12px;
  line-height: 1.75;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.message.user .message-body p {
  width: fit-content;
  max-width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(44, 131, 164, 0.28);
  border-radius: 5px;
  background: rgba(8, 39, 59, 0.72);
  color: #d9eef6;
}

.message.error .message-body p {
  color: #ff9e99;
}

.stream-caret {
  width: 6px;
  height: 13px;
  margin-left: 3px;
  display: inline-block;
  vertical-align: -2px;
  background: #55dffb;
  animation: caret-blink 0.8s step-end infinite;
}

.composer {
  padding: 12px 14px 13px;
  border-top: 1px solid rgba(45, 129, 162, 0.32);
  background: #04111d;
}

.request-error {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ff908b;
  font-size: 10px;
}

.request-error span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.input-shell {
  position: relative;
  border: 1px solid rgba(49, 145, 181, 0.48);
  border-radius: 6px;
  background: #061b2a;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.input-shell:focus-within {
  border-color: #37cce9;
  box-shadow: 0 0 0 3px rgba(55, 204, 233, 0.09);
}

.input-shell textarea {
  width: 100%;
  min-height: 68px;
  max-height: 150px;
  padding: 10px 48px 10px 11px;
  border: 0;
  outline: 0;
  resize: vertical;
  background: transparent;
  color: #d7edf6;
  font: 12px/1.6 'Microsoft YaHei', sans-serif;
}

.input-shell textarea::placeholder {
  color: #4f7182;
}

.send-button {
  right: 8px;
  bottom: 8px;
  width: 32px;
  height: 32px;
  position: absolute;
  border-color: rgba(55, 205, 235, 0.5);
  border-radius: 5px;
  background: #087c9f;
  color: #edfbff;
}

.send-button:hover:not(:disabled) {
  border-color: #77eaff;
  background: #0a94b9;
}

.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.stop-generating {
  border-color: rgba(255, 113, 106, 0.52);
  background: #8d3038;
}

.ai-panel-enter-active,
.ai-panel-leave-active {
  transition: opacity 180ms ease;
}

.ai-panel-enter-active .ai-panel,
.ai-panel-leave-active .ai-panel {
  transition: transform 180ms ease;
}

.ai-panel-enter-from,
.ai-panel-leave-to {
  opacity: 0;
}

.ai-panel-enter-from .ai-panel,
.ai-panel-leave-to .ai-panel {
  transform: translateX(100%);
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}

@media (max-width: 520px) {
  .ai-panel {
    width: 100vw;
  }

  .panel-backdrop {
    display: none;
  }
}
</style>
