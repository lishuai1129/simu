<script setup lang="ts">
defineOptions({ name: 'SessionManagementView' })

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertCircle,
  Building2,
  LoaderCircle,
  MonitorPlay,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-vue-next'

import {
  createSession,
  deleteSession,
  getSessions,
  type Session,
  type SessionState,
} from '@/api/sessions'
import { useTopoStore } from '@/stores/topo'

const router = useRouter()
const topoStore = useTopoStore()

const sessions = ref<Session[]>([])
const loading = ref(false)
const loadError = ref('')
const showCreateDialog = ref(false)
const newSessionName = ref('')
const nameError = ref('')
const creating = ref(false)
const sessionToDelete = ref<Session | null>(null)
const deletingId = ref<string | null>(null)
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

const sceneCountText = computed(() => `${sessions.value.length} 个场景`)

const stateInfo: Record<SessionState, { label: string; className: string }> = {
  DEFINITION: { label: '定义中', className: 'state-definition' },
  RUNTIME: { label: '运行中', className: 'state-runtime' },
  SHUTDOWN: { label: '已停止', className: 'state-shutdown' },
}

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { message, type }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 3200)
}

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

async function loadSessions() {
  loading.value = true
  loadError.value = ''
  try {
    sessions.value = await getSessions()
  } catch (error) {
    loadError.value = errorMessage(error, '场景列表加载失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  newSessionName.value = ''
  nameError.value = ''
  showCreateDialog.value = true
}

function closeCreateDialog() {
  if (creating.value) return
  showCreateDialog.value = false
}

async function submitCreate() {
  const name = newSessionName.value.trim()
  if (!name) {
    nameError.value = '请输入场景名称'
    return
  }
  if (name.length > 64) {
    nameError.value = '场景名称不能超过 64 个字符'
    return
  }

  creating.value = true
  nameError.value = ''
  try {
    const session = await createSession({ name })
    sessions.value = [session, ...sessions.value]
    showCreateDialog.value = false
    showToast(`场景“${session.name}”创建成功`)
  } catch (error) {
    nameError.value = errorMessage(error, '创建场景失败')
  } finally {
    creating.value = false
  }
}

function openDeleteDialog(session: Session) {
  sessionToDelete.value = session
}

function closeDeleteDialog() {
  if (deletingId.value) return
  sessionToDelete.value = null
}

async function confirmDelete() {
  const session = sessionToDelete.value
  if (!session) return

  deletingId.value = session.id
  try {
    await deleteSession(session.id)
    sessions.value = sessions.value.filter((item) => item.id !== session.id)
    if (topoStore.currentSessionId === session.id) topoStore.clearSession()
    sessionToDelete.value = null
    showToast(`场景“${session.name}”已删除`)
  } catch (error) {
    showToast(errorMessage(error, '删除场景失败'), 'error')
  } finally {
    deletingId.value = null
  }
}

async function openDemo(session: Session) {
  topoStore.selectSession(session)
  await router.push({ name: 'cesium' })
}

onMounted(loadSessions)
</script>

<template>
  <div class="scene-page">
    <header class="institute-header">
      <div class="institute-inner">
        <div class="institute-brand">
          <div class="institute-mark" aria-hidden="true">20</div>
        </div>
        <div class="system-title">
          <span aria-hidden="true"></span>
          <div>
            <strong>20所仿真场景管理</strong>
            <small>SIMULATION SCENE MANAGEMENT</small>
          </div>
          <span aria-hidden="true"></span>
        </div>
        <div class="institute-unit">
          <span class="online-dot" aria-hidden="true"></span>
          <div>
            <small>系统状态</small>
            <strong>在线</strong>
          </div>
        </div>
      </div>
    </header>

    <main class="scene-main">
      <div class="page-heading">
        <div>
          <span class="heading-kicker">SCENE LIBRARY</span>
          <h1>仿真场景列表</h1>
          <p>共 {{ sceneCountText }} · 选择场景进入组网仿真</p>
        </div>
        <div class="heading-actions">
          <button
            class="icon-button"
            type="button"
            title="刷新场景列表"
            aria-label="刷新场景列表"
            :disabled="loading"
            @click="loadSessions"
          >
            <RefreshCw :size="18" :class="{ spinning: loading }" aria-hidden="true" />
          </button>
          <button class="primary-button" type="button" @click="openCreateDialog">
            <Plus :size="18" aria-hidden="true" />
            创建场景
          </button>
        </div>
      </div>

      <div v-if="loadError" class="error-banner" role="alert">
        <AlertCircle :size="19" aria-hidden="true" />
        <span>{{ loadError }}</span>
        <button type="button" @click="loadSessions">重新加载</button>
      </div>

      <section class="scene-table" aria-label="场景列表">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>场景名称</th>
                <th>状态</th>
                <th>创建用户</th>
                <th>创建时间</th>
                <th>更新时间</th>
                <th class="actions-column">操作</th>
              </tr>
            </thead>
            <tbody v-if="loading">
              <tr v-for="index in 5" :key="index" class="skeleton-row">
                <td><span class="skeleton skeleton-name"></span></td>
                <td><span class="skeleton skeleton-state"></span></td>
                <td><span class="skeleton skeleton-user"></span></td>
                <td><span class="skeleton skeleton-date"></span></td>
                <td><span class="skeleton skeleton-date"></span></td>
                <td><span class="skeleton skeleton-action"></span></td>
              </tr>
            </tbody>
            <tbody v-else-if="sessions.length">
              <tr v-for="session in sessions" :key="session.id">
                <td>
                  <div class="scene-name">
                    <span class="scene-initial">{{ session.name.slice(0, 1).toUpperCase() }}</span>
                    <strong :title="session.name">{{ session.name }}</strong>
                  </div>
                </td>
                <td>
                  <span class="state-badge" :class="stateInfo[session.state].className">
                    <span class="state-dot" aria-hidden="true"></span>
                    {{ stateInfo[session.state].label }}
                  </span>
                </td>
                <td>{{ session.userName || '未指定' }}</td>
                <td>{{ formatDateTime(session.createdAt) }}</td>
                <td>{{ formatDateTime(session.updatedAt) }}</td>
                <td>
                  <div class="row-actions">
                    <button class="demo-button" type="button" @click="openDemo(session)">
                      <MonitorPlay :size="16" aria-hidden="true" />
                      演示
                    </button>
                    <button
                      class="delete-button"
                      type="button"
                      :disabled="deletingId === session.id"
                      @click="openDeleteDialog(session)"
                    >
                      <LoaderCircle
                        v-if="deletingId === session.id"
                        :size="16"
                        class="spinning"
                        aria-hidden="true"
                      />
                      <Trash2 v-else :size="16" aria-hidden="true" />
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!loading && !sessions.length && !loadError" class="empty-state">
          <Building2 :size="36" stroke-width="1.5" aria-hidden="true" />
          <strong>暂无场景</strong>
          <button class="primary-button" type="button" @click="openCreateDialog">
            <Plus :size="18" aria-hidden="true" />
            创建场景
          </button>
        </div>
      </section>
    </main>

    <div v-if="showCreateDialog" class="dialog-backdrop" @click.self="closeCreateDialog">
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="create-title">
        <div class="dialog-header">
          <div>
            <h2 id="create-title">创建场景</h2>
            <p>初始状态：定义中</p>
          </div>
          <button
            class="icon-button"
            type="button"
            title="关闭"
            aria-label="关闭创建场景窗口"
            :disabled="creating"
            @click="closeCreateDialog"
          >
            <X :size="19" aria-hidden="true" />
          </button>
        </div>
        <form @submit.prevent="submitCreate">
          <label for="session-name">场景名称</label>
          <input
            id="session-name"
            v-model="newSessionName"
            type="text"
            maxlength="64"
            autocomplete="off"
            autofocus
            placeholder="请输入场景名称"
            :aria-invalid="Boolean(nameError)"
            @input="nameError = ''"
          />
          <p v-if="nameError" class="field-error" role="alert">{{ nameError }}</p>
          <div class="dialog-actions">
            <button class="secondary-button" type="button" :disabled="creating" @click="closeCreateDialog">
              取消
            </button>
            <button class="primary-button" type="submit" :disabled="creating">
              <LoaderCircle v-if="creating" :size="17" class="spinning" aria-hidden="true" />
              <Plus v-else :size="17" aria-hidden="true" />
              {{ creating ? '创建中' : '确认创建' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="sessionToDelete" class="dialog-backdrop" @click.self="closeDeleteDialog">
      <section class="dialog delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
        <div class="danger-icon"><Trash2 :size="22" aria-hidden="true" /></div>
        <h2 id="delete-title">删除场景</h2>
        <p>确定删除场景“{{ sessionToDelete.name }}”吗？该操作不可恢复。</p>
        <div class="dialog-actions">
          <button class="secondary-button" type="button" :disabled="Boolean(deletingId)" @click="closeDeleteDialog">
            取消
          </button>
          <button class="danger-button" type="button" :disabled="Boolean(deletingId)" @click="confirmDelete">
            <LoaderCircle v-if="deletingId" :size="17" class="spinning" aria-hidden="true" />
            <Trash2 v-else :size="17" aria-hidden="true" />
            {{ deletingId ? '删除中' : '确认删除' }}
          </button>
        </div>
      </section>
    </div>

    <Transition name="toast">
      <div v-if="toast" class="toast" :class="toast.type" role="status">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.scene-page {
  min-height: 100vh;
  background: #f3f6f9;
  color: #17202a;
}

.institute-header {
  height: 68px;
  background: #ffffff;
  border-bottom: 1px solid #dce3e9;
}

.institute-inner {
  width: min(1440px, 100%);
  height: 100%;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.institute-mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 6px;
  background: #075a9c;
  color: #ffffff;
  font-size: 17px;
  font-weight: 750;
}

.institute-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.institute-copy strong {
  overflow: hidden;
  color: #162b3d;
  font-size: 16px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.institute-copy span {
  color: #6f7f8d;
  font-size: 12px;
}

.institute-unit {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #51606d;
  font-size: 13px;
  font-weight: 600;
}

.scene-main {
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 34px 32px 48px;
}

.page-heading {
  min-height: 52px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.page-heading h1 {
  color: #17202a;
  font-size: 24px;
  font-weight: 680;
  line-height: 1.25;
}

.page-heading p {
  margin-top: 5px;
  color: #71808d;
  font-size: 13px;
}

.heading-actions,
.row-actions,
.dialog-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

button {
  font: inherit;
}

.primary-button,
.secondary-button,
.danger-button,
.demo-button,
.delete-button,
.icon-button {
  min-height: 36px;
  border: 1px solid transparent;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}

.primary-button {
  padding: 0 15px;
  background: #075a9c;
  color: #ffffff;
  font-weight: 600;
}

.primary-button:hover:not(:disabled) {
  background: #064c83;
}

.secondary-button {
  padding: 0 16px;
  background: #ffffff;
  border-color: #cfd8df;
  color: #3d4b57;
}

.secondary-button:hover:not(:disabled),
.icon-button:hover:not(:disabled) {
  background: #f3f6f8;
  border-color: #b8c4cd;
}

.danger-button {
  padding: 0 15px;
  background: #b42318;
  color: #ffffff;
  font-weight: 600;
}

.danger-button:hover:not(:disabled) {
  background: #912018;
}

.icon-button {
  width: 36px;
  padding: 0;
  background: #ffffff;
  border-color: #cfd8df;
  color: #53616d;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.error-banner {
  min-height: 44px;
  margin-bottom: 14px;
  padding: 9px 12px;
  border: 1px solid #f0b4ac;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 9px;
  background: #fff4f2;
  color: #912018;
  font-size: 13px;
}

.error-banner span {
  flex: 1;
}

.error-banner button {
  border: 0;
  background: transparent;
  color: #912018;
  font-weight: 650;
  cursor: pointer;
}

.scene-table {
  min-height: 350px;
  overflow: hidden;
  border: 1px solid #dce3e9;
  border-radius: 8px;
  background: #ffffff;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  table-layout: fixed;
}

th,
td {
  padding: 16px 18px;
  border-bottom: 1px solid #e8edf1;
  text-align: left;
  vertical-align: middle;
}

th {
  height: 48px;
  background: #f8fafb;
  color: #5c6975;
  font-size: 12px;
  font-weight: 650;
}

td {
  height: 70px;
  color: #52606c;
  font-size: 13px;
}

tbody tr:last-child td {
  border-bottom: 0;
}

tbody tr:not(.skeleton-row):hover {
  background: #fafcfd;
}

th:first-child,
td:first-child {
  width: 24%;
}

th:nth-child(2),
td:nth-child(2) {
  width: 12%;
}

th:nth-child(3),
td:nth-child(3) {
  width: 13%;
}

th:nth-child(4),
td:nth-child(4),
th:nth-child(5),
td:nth-child(5) {
  width: 17%;
}

.actions-column,
td:last-child {
  width: 17%;
  text-align: right;
}

.scene-name {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
}

.scene-initial {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid #b9d4e7;
  border-radius: 6px;
  background: #edf6fb;
  color: #075a9c;
  font-weight: 700;
}

.scene-name strong {
  overflow: hidden;
  color: #1d2b36;
  font-size: 14px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-badge {
  width: fit-content;
  min-height: 26px;
  padding: 0 9px;
  border: 1px solid;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.state-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.state-definition {
  border-color: #b8cee0;
  background: #eef5fa;
  color: #315f82;
}

.state-runtime {
  border-color: #9ecdb2;
  background: #edf8f1;
  color: #187044;
}

.state-shutdown {
  border-color: #e3b1aa;
  background: #fff3f1;
  color: #a0392e;
}

.row-actions {
  justify-content: flex-end;
}

.demo-button,
.delete-button {
  min-height: 32px;
  padding: 0 10px;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
}

.demo-button {
  border-color: #a7c5db;
  color: #075a9c;
}

.demo-button:hover {
  background: #edf6fb;
}

.delete-button {
  border-color: #e0b5b0;
  color: #a3342a;
}

.delete-button:hover:not(:disabled) {
  background: #fff3f1;
}

.empty-state {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 13px;
  color: #84919c;
}

.empty-state strong {
  color: #53616d;
  font-size: 14px;
  font-weight: 600;
}

.skeleton {
  height: 12px;
  display: block;
  border-radius: 4px;
  background: #e9eef2;
  animation: pulse 1.2s ease-in-out infinite;
}

.skeleton-name,
.skeleton-date {
  width: 75%;
}

.skeleton-state {
  width: 64px;
}

.skeleton-user {
  width: 60%;
}

.skeleton-action {
  width: 100px;
  margin-left: auto;
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  padding: 20px;
  display: grid;
  place-items: center;
  background: rgba(18, 29, 39, 0.46);
}

.dialog {
  width: min(430px, 100%);
  padding: 22px;
  border: 1px solid #d8e0e6;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 20px 50px rgba(16, 35, 50, 0.18);
}

.dialog-header {
  margin-bottom: 22px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dialog h2 {
  color: #17202a;
  font-size: 18px;
  font-weight: 680;
}

.dialog-header p {
  margin-top: 4px;
  color: #71808d;
  font-size: 12px;
}

.dialog form label {
  margin-bottom: 7px;
  display: block;
  color: #34434f;
  font-size: 13px;
  font-weight: 600;
}

.dialog input {
  width: 100%;
  height: 40px;
  padding: 0 11px;
  border: 1px solid #c8d2da;
  border-radius: 6px;
  outline: none;
  color: #1c2933;
  font: inherit;
}

.dialog input:focus {
  border-color: #1675b8;
  box-shadow: 0 0 0 3px rgba(22, 117, 184, 0.12);
}

.dialog input[aria-invalid='true'] {
  border-color: #c43d32;
}

.field-error {
  margin-top: 6px;
  color: #b42318;
  font-size: 12px;
}

.dialog-actions {
  margin-top: 24px;
  justify-content: flex-end;
}

.delete-dialog {
  text-align: center;
}

.delete-dialog > p {
  margin: 9px auto 0;
  max-width: 330px;
  color: #63717d;
  font-size: 13px;
  line-height: 1.7;
}

.delete-dialog .dialog-actions {
  justify-content: center;
}

.danger-icon {
  width: 44px;
  height: 44px;
  margin: 0 auto 14px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff0ee;
  color: #b42318;
}

.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 150;
  max-width: min(380px, calc(100vw - 48px));
  padding: 11px 15px;
  border: 1px solid;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(22, 36, 48, 0.15);
  font-size: 13px;
  font-weight: 600;
}

.toast.success {
  border-color: #9ecdb2;
  color: #187044;
}

.toast.error {
  border-color: #e3b1aa;
  color: #a0392e;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  50% {
    opacity: 0.45;
  }
}

@media (max-width: 720px) {
  .institute-inner,
  .scene-main {
    padding-left: 16px;
    padding-right: 16px;
  }

  .institute-unit {
    display: none;
  }

  .institute-copy strong {
    font-size: 14px;
  }

  .scene-main {
    padding-top: 24px;
  }

  .page-heading {
    align-items: flex-end;
  }

  .page-heading h1 {
    font-size: 21px;
  }
}

@media (max-width: 480px) {
  .institute-copy span {
    display: none;
  }

  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .heading-actions {
    width: 100%;
  }

  .heading-actions .primary-button {
    flex: 1;
  }
}

/* Scene command-center theme */
.scene-page {
  min-height: 100vh;
  background-color: #05090e;
  background-image:
    linear-gradient(rgba(37, 193, 231, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37, 193, 231, 0.035) 1px, transparent 1px);
  background-size: 42px 42px;
  color: #c7dae5;
}

.institute-header {
  position: relative;
  height: 82px;
  overflow: hidden;
  border-bottom: 1px solid rgba(42, 193, 230, 0.55);
  background: rgba(4, 12, 20, 0.98);
  box-shadow: 0 9px 30px rgba(0, 0, 0, 0.34);
}

.institute-header::before,
.institute-header::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.institute-header::before {
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: #2cd8ff;
  box-shadow: 0 0 12px rgba(44, 216, 255, 0.8);
}

.institute-header::after {
  right: 20%;
  bottom: 0;
  left: 20%;
  height: 3px;
  background: rgba(49, 217, 255, 0.72);
  filter: blur(4px);
}

.institute-inner {
  position: relative;
  width: min(1540px, 100%);
  padding: 0 36px;
  justify-content: space-between;
}

.institute-brand {
  min-width: 120px;
  display: flex;
  align-items: center;
  gap: 11px;
}

.institute-mark {
  width: 43px;
  height: 43px;
  border: 1px solid rgba(62, 212, 247, 0.65);
  border-radius: 5px;
  background: #08283a;
  box-shadow:
    inset 0 0 16px rgba(43, 200, 239, 0.14),
    0 0 18px rgba(26, 164, 202, 0.16);
  color: #69e5ff;
  font-family: Consolas, monospace;
  font-size: 18px;
  font-weight: 750;
}

.institute-copy strong {
  color: #d9f4ff;
  font-family: Consolas, monospace;
  font-size: 14px;
  letter-spacing: 0;
}

.institute-copy span {
  color: #668798;
  font-size: 10px;
}

.system-title {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(610px, 46vw);
  display: grid;
  grid-template-columns: minmax(28px, 1fr) auto minmax(28px, 1fr);
  align-items: center;
  gap: 18px;
  text-align: center;
  transform: translate(-50%, -50%);
}

.system-title > span {
  height: 1px;
  background: #2bcdeb;
  box-shadow: 0 0 8px rgba(43, 205, 235, 0.7);
}

.system-title > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.system-title strong {
  color: #75e7ff;
  text-shadow:
    0 0 9px rgba(50, 208, 239, 0.54),
    0 0 20px rgba(50, 208, 239, 0.22);
  font-size: 23px;
  font-weight: 700;
}

.system-title small {
  color: #46778d;
  font-family: Consolas, monospace;
  font-size: 8px;
}

.institute-unit {
  min-width: 120px;
  margin-left: 0;
  justify-content: flex-end;
  gap: 9px;
}

.institute-unit > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.institute-unit small {
  color: #5c7a8a;
  font-size: 9px;
  font-weight: 500;
}

.institute-unit strong {
  color: #5ee7a3;
  font-size: 11px;
  font-weight: 650;
}

.online-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #48e69a;
  box-shadow: 0 0 10px #48e69a;
  animation: online-pulse 1.8s ease-in-out infinite;
}

.scene-main {
  width: min(1460px, 100%);
  padding: 38px 32px 56px;
}

.page-heading {
  min-height: 66px;
  margin-bottom: 19px;
}

.heading-kicker {
  display: block;
  margin-bottom: 5px;
  color: #35cdeb;
  font-family: Consolas, monospace;
  font-size: 9px;
}

.page-heading h1 {
  color: #e2f3fa;
  font-size: 24px;
  font-weight: 670;
}

.page-heading p {
  color: #628292;
  font-size: 11px;
}

.primary-button,
.secondary-button,
.danger-button,
.demo-button,
.delete-button,
.icon-button {
  border-radius: 5px;
}

.primary-button {
  min-height: 38px;
  border-color: rgba(45, 211, 241, 0.58);
  background: #087ca0;
  box-shadow: 0 0 16px rgba(17, 170, 209, 0.16);
  color: #f1fcff;
}

.primary-button:hover:not(:disabled) {
  border-color: #72e8ff;
  background: #0993bb;
}

.secondary-button,
.icon-button {
  border-color: rgba(65, 139, 170, 0.46);
  background: #081b29;
  color: #8ab6c9;
}

.secondary-button:hover:not(:disabled),
.icon-button:hover:not(:disabled) {
  border-color: rgba(74, 209, 244, 0.7);
  background: #0b2a3c;
  color: #bdefff;
}

.danger-button {
  border-color: rgba(244, 91, 91, 0.55);
  background: #a42d38;
}

.danger-button:hover:not(:disabled) {
  background: #c23b46;
}

.error-banner {
  border-color: rgba(255, 103, 103, 0.42);
  background: rgba(94, 25, 32, 0.62);
  color: #ffaaa7;
}

.error-banner button {
  color: #ffc1be;
}

.scene-table {
  min-height: 380px;
  border-color: rgba(42, 138, 177, 0.38);
  border-radius: 7px;
  background: rgba(5, 18, 29, 0.94);
  box-shadow:
    0 20px 55px rgba(0, 0, 0, 0.25),
    inset 0 1px rgba(89, 213, 247, 0.04);
}

th,
td {
  border-bottom-color: rgba(47, 111, 140, 0.22);
}

th {
  height: 50px;
  background: #081d2b;
  color: #6d9db2;
  font-size: 10px;
  text-transform: uppercase;
}

td {
  height: 76px;
  color: #7899a9;
  font-size: 12px;
}

tbody tr:not(.skeleton-row) {
  transition:
    background-color 150ms ease,
    box-shadow 150ms ease;
}

tbody tr:not(.skeleton-row):hover {
  background: rgba(14, 55, 75, 0.42);
  box-shadow: inset 3px 0 #32cce9;
}

.scene-initial {
  border-color: rgba(46, 187, 224, 0.42);
  border-radius: 5px;
  background: #082a3e;
  color: #65ddfa;
  box-shadow: inset 0 0 12px rgba(53, 196, 230, 0.09);
}

.scene-name strong {
  color: #d9edf5;
  font-size: 13px;
}

.state-badge {
  min-height: 25px;
  border-radius: 4px;
  font-size: 10px;
}

.state-definition {
  border-color: rgba(71, 174, 230, 0.52);
  background: rgba(29, 103, 148, 0.2);
  color: #6acaff;
}

.state-runtime {
  border-color: rgba(60, 213, 137, 0.48);
  background: rgba(21, 121, 72, 0.2);
  color: #57e49c;
}

.state-shutdown {
  border-color: rgba(232, 93, 93, 0.42);
  background: rgba(135, 42, 48, 0.2);
  color: #ff8c8a;
}

.state-runtime .state-dot {
  box-shadow: 0 0 7px currentColor;
}

.demo-button,
.delete-button {
  min-height: 31px;
  background: rgba(4, 18, 29, 0.58);
}

.demo-button {
  border-color: rgba(53, 188, 226, 0.48);
  color: #62d8f7;
}

.demo-button:hover {
  border-color: #62d8f7;
  background: rgba(18, 91, 119, 0.42);
}

.delete-button {
  border-color: rgba(225, 85, 85, 0.42);
  color: #ff8582;
}

.delete-button:hover:not(:disabled) {
  border-color: #ff8582;
  background: rgba(115, 33, 40, 0.42);
}

.empty-state {
  color: #527183;
}

.empty-state strong {
  color: #91afbd;
}

.skeleton {
  background: #102d3c;
}

.dialog-backdrop {
  background: rgba(0, 5, 10, 0.72);
  backdrop-filter: blur(4px);
}

.dialog {
  border-color: rgba(49, 174, 215, 0.48);
  border-radius: 7px;
  background: #071725;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.58),
    inset 0 1px rgba(99, 224, 255, 0.05);
}

.dialog h2 {
  color: #e0f3fa;
}

.dialog-header p,
.delete-dialog > p {
  color: #668696;
}

.dialog form label {
  color: #8fb5c6;
}

.dialog input {
  border-color: rgba(55, 130, 162, 0.48);
  background: #04111c;
  color: #d6edf6;
}

.dialog input::placeholder {
  color: #456477;
}

.dialog input:focus {
  border-color: #38cce9;
  box-shadow: 0 0 0 3px rgba(56, 204, 233, 0.11);
}

.field-error {
  color: #ff8e8a;
}

.danger-icon {
  border: 1px solid rgba(241, 84, 84, 0.35);
  background: rgba(122, 32, 39, 0.32);
  color: #ff817e;
}

.toast {
  border-radius: 5px;
  background: #071a27;
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.48);
}

.toast.success {
  border-color: rgba(66, 220, 145, 0.5);
  color: #65e7a8;
}

.toast.error {
  border-color: rgba(241, 91, 91, 0.5);
  color: #ff9692;
}

@keyframes online-pulse {
  50% {
    opacity: 0.45;
    box-shadow: 0 0 4px #48e69a;
  }
}

@media (max-width: 900px) {
  .institute-brand {
    min-width: 52px;
  }

  .institute-copy,
  .institute-unit {
    display: none;
  }

  .system-title {
    width: min(620px, calc(100% - 150px));
  }
}

@media (max-width: 600px) {
  .institute-header {
    height: 72px;
  }

  .institute-inner {
    padding: 0 14px;
  }

  .institute-mark {
    width: 38px;
    height: 38px;
    font-size: 15px;
  }

  .system-title {
    left: auto;
    right: 14px;
    width: calc(100% - 76px);
    grid-template-columns: 1fr;
    transform: translateY(-50%);
  }

  .system-title > span,
  .system-title small {
    display: none;
  }

  .system-title strong {
    font-size: 17px;
  }

  .scene-main {
    padding: 24px 14px 40px;
  }

  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .heading-actions {
    width: 100%;
  }

  .heading-actions .primary-button {
    flex: 1;
  }
}
</style>
