<template>
  <el-dialog
    v-model="visible"
    class="server-dialog"
    modal-class="server-dialog-overlay"
    width="min(820px, calc(100vw - 28px))"
    append-to-body
    :close-on-click-modal="false"
    destroy-on-close
    @open="handleOpen"
    @closed="resetRegistration"
  >
    <template #header>
      <div class="dialog-title">
        <span class="title-icon"><el-icon :size="19"><Monitor /></el-icon></span>
        <div>
          <h2>服务器管理</h2>
          <p>CORE DAEMON REGISTRY</p>
        </div>
      </div>
    </template>

    <div class="server-manager">
      <div class="manager-toolbar">
        <div class="server-summary">
          <span>已注册</span>
          <strong>{{ serverStore.servers.length }}</strong>
          <span>台服务器</span>
        </div>
        <div class="toolbar-actions">
          <el-button :loading="serverStore.loading" @click="refreshServers">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button type="primary" @click="showRegistration = !showRegistration">
            <el-icon><Plus /></el-icon>
            注册服务器
          </el-button>
        </div>
      </div>

      <Transition name="registration">
        <el-form
          v-if="showRegistration"
          ref="serverFormRef"
          class="registration-form"
          :model="serverForm"
          :rules="serverRules"
          label-position="top"
          @submit.prevent="submitServer"
        >
          <div class="form-grid">
            <el-form-item label="服务器名称" prop="name">
              <el-input v-model="serverForm.name" maxlength="64" placeholder="core-node-01" />
            </el-form-item>
            <el-form-item label="IP 地址 / 主机名" prop="host">
              <el-input v-model="serverForm.host" maxlength="253" placeholder="192.168.1.10" />
            </el-form-item>
            <el-form-item label="gRPC 端口" prop="port">
              <el-input-number v-model="serverForm.port" :min="1" :max="65535" controls-position="right" />
            </el-form-item>
            <el-form-item label="场景容量" prop="capacity">
              <el-input-number v-model="serverForm.capacity" :min="1" :max="10000" controls-position="right" />
            </el-form-item>
          </div>
          <div class="form-actions">
            <el-button @click="resetRegistration">取消</el-button>
            <el-button type="primary" native-type="submit" :loading="submitting">确认注册</el-button>
          </div>
        </el-form>
      </Transition>

      <div class="server-table-wrap">
        <el-table
          v-loading="serverStore.loading"
          :data="serverStore.servers"
          height="360"
          empty-text="暂无服务器"
          row-key="id"
        >
          <el-table-column label="状态" width="92">
            <template #default="{ row }">
              <span v-if="serverStore.checkingIds.has(row.id)" class="status-cell status-checking">
                <el-icon class="is-loading"><Loading /></el-icon>
                探测中
              </span>
              <span
                v-else-if="serverStore.onlineStatus[row.id] === true"
                class="status-cell status-online"
              >
                <span class="status-dot"></span>
                在线
              </span>
              <span
                v-else-if="serverStore.onlineStatus[row.id] === false"
                class="status-cell status-offline"
              >
                <span class="status-dot"></span>
                离线
              </span>
              <span v-else class="status-cell status-unknown">
                <span class="status-dot"></span>
                未知
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="name" label="服务器名称" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="server-name">
                <el-icon><Cpu /></el-icon>
                <strong>{{ row.name }}</strong>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="连接地址" min-width="170">
            <template #default="{ row }">
              <span class="server-address">{{ row.host }}:{{ row.port }}</span>
            </template>
          </el-table-column>

          <el-table-column label="场景容量" width="100" align="center">
            <template #default="{ row }">
              <span class="capacity-value">{{ row.capacity }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" align="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button
                  text
                  type="primary"
                  :loading="serverStore.checkingIds.has(row.id)"
                  @click="probeServer(row)"
                >
                  探测
                </el-button>
                <el-button
                  text
                  type="danger"
                  :loading="removingId === row.id"
                  @click="removeServer(row)"
                >
                  移除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

import type { CoreServer, RegisterServerPayload } from '@/api/servers'
import { useServerStore } from '@/stores/servers'

defineOptions({ name: 'ServerManagementDialog' })

const visible = defineModel<boolean>({ default: false })
const serverStore = useServerStore()
const serverFormRef = ref<FormInstance>()
const showRegistration = ref(false)
const submitting = ref(false)
const removingId = ref<string | null>(null)

const defaultServerForm = (): RegisterServerPayload => ({
  name: '',
  host: '',
  port: 50051,
  capacity: 10,
})

const serverForm = reactive<RegisterServerPayload>(defaultServerForm())

const serverRules: FormRules<RegisterServerPayload> = {
  name: [
    { required: true, message: '请输入服务器名称', trigger: 'blur' },
    { min: 1, max: 64, message: '名称长度不能超过 64 个字符', trigger: 'blur' },
  ],
  host: [{ required: true, message: '请输入 IP 地址或主机名', trigger: 'blur' }],
  port: [{ required: true, message: '请输入 gRPC 端口', trigger: 'change' }],
  capacity: [{ required: true, message: '请输入场景容量', trigger: 'change' }],
}

async function handleOpen() {
  await refreshServers()
}

async function refreshServers() {
  try {
    await serverStore.fetchServers()
    await serverStore.checkAllServerStatus()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '服务器列表加载失败')
  }
}

async function submitServer() {
  if (!serverFormRef.value) return
  const valid = await serverFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const server = await serverStore.addServer({ ...serverForm })
    ElMessage.success(`服务器“${server.name}”注册成功`)
    resetRegistration()
    await serverStore.checkServerStatus(server.id).catch(() => undefined)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '服务器注册失败')
  } finally {
    submitting.value = false
  }
}

function resetRegistration() {
  showRegistration.value = false
  Object.assign(serverForm, defaultServerForm())
  serverFormRef.value?.clearValidate()
}

async function probeServer(server: CoreServer) {
  try {
    const online = await serverStore.checkServerStatus(server.id)
    ElMessage({
      type: online ? 'success' : 'warning',
      message: `${server.name} ${online ? '在线' : '离线'}`,
    })
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '服务器状态探测失败')
  }
}

async function removeServer(server: CoreServer) {
  try {
    await ElMessageBox.confirm(`确定移除服务器“${server.name}”吗？`, '移除服务器', {
      type: 'warning',
      confirmButtonText: '确认移除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  removingId.value = server.id
  try {
    await serverStore.removeServer(server.id)
    ElMessage.success('服务器已移除')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '服务器移除失败')
  } finally {
    removingId.value = null
  }
}
</script>

<style scoped>
.server-manager {
  color: #cfe8f7;
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 11px;
}

.title-icon {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(45, 198, 255, 0.5);
  border-radius: 5px;
  display: grid;
  place-items: center;
  background: rgba(16, 132, 181, 0.18);
  color: #5edcff;
  box-shadow: inset 0 0 12px rgba(28, 183, 235, 0.12);
}

.dialog-title h2 {
  color: #dff6ff;
  font-size: 17px;
  font-weight: 650;
}

.dialog-title p {
  margin-top: 2px;
  color: #4f88a8;
  font-family: Consolas, monospace;
  font-size: 9px;
  letter-spacing: 1px;
}

.manager-toolbar {
  min-height: 46px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.server-summary {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: #6f9bb6;
  font-size: 12px;
}

.server-summary strong {
  color: #44d7ff;
  font-family: Consolas, monospace;
  font-size: 20px;
  text-shadow: 0 0 9px rgba(68, 215, 255, 0.45);
}

.toolbar-actions,
.form-actions,
.row-actions,
.server-name,
.status-cell {
  display: flex;
  align-items: center;
}

.toolbar-actions,
.form-actions,
.row-actions {
  gap: 8px;
}

.registration-form {
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid rgba(48, 136, 177, 0.32);
  border-radius: 6px;
  background: rgba(5, 27, 48, 0.72);
}

.form-grid {
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 0.8fr 0.8fr;
  gap: 10px;
}

.form-actions {
  justify-content: flex-end;
}

.server-table-wrap {
  overflow: hidden;
  border: 1px solid rgba(46, 124, 160, 0.34);
  border-radius: 6px;
}

.status-cell {
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 7px currentColor;
}

.status-online {
  color: #45df96;
}

.status-offline {
  color: #ff766f;
}

.status-checking {
  color: #5edcff;
}

.status-unknown {
  color: #7d97a6;
}

.server-name {
  min-width: 0;
  gap: 7px;
  color: #87c9ec;
}

.server-name strong {
  overflow: hidden;
  color: #d9effa;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server-address {
  color: #8db5ca;
  font-family: Consolas, monospace;
  font-size: 12px;
}

.capacity-value {
  min-width: 32px;
  padding: 2px 7px;
  border: 1px solid rgba(64, 160, 202, 0.34);
  border-radius: 4px;
  display: inline-block;
  color: #76d9ff;
  font-family: Consolas, monospace;
}

.registration-enter-active,
.registration-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.registration-enter-from,
.registration-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

:global(.server-dialog-overlay) {
  background: rgba(0, 8, 18, 0.68);
  backdrop-filter: blur(3px);
}

:global(.server-dialog.el-dialog) {
  --el-bg-color: #06182b;
  --el-bg-color-overlay: #06182b;
  --el-border-color: rgba(50, 143, 183, 0.42);
  --el-border-color-light: rgba(50, 143, 183, 0.28);
  --el-fill-color-blank: rgba(7, 27, 47, 0.86);
  --el-fill-color-light: rgba(16, 50, 74, 0.7);
  --el-fill-color-lighter: rgba(20, 58, 82, 0.55);
  --el-text-color-primary: #d7edf8;
  --el-text-color-regular: #9fc2d5;
  --el-text-color-secondary: #7195a9;
  --el-mask-color: rgba(0, 0, 0, 0.65);
  overflow: hidden;
  border: 1px solid rgba(44, 177, 229, 0.5);
  border-radius: 7px;
  background: #06182b;
  box-shadow:
    0 22px 70px rgba(0, 4, 12, 0.72),
    inset 0 1px rgba(109, 218, 255, 0.08);
}

:global(.server-dialog .el-dialog__header) {
  margin: 0;
  padding: 15px 18px;
  border-bottom: 1px solid rgba(49, 139, 179, 0.32);
  background: rgba(4, 21, 40, 0.9);
}

:global(.server-dialog .el-dialog__body) {
  padding: 14px 18px 18px;
}

:global(.server-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: #78a9c2;
}

:global(.server-dialog .el-table) {
  --el-table-bg-color: rgba(5, 24, 42, 0.82);
  --el-table-tr-bg-color: rgba(5, 24, 42, 0.82);
  --el-table-header-bg-color: rgba(8, 38, 64, 0.96);
  --el-table-row-hover-bg-color: rgba(15, 61, 87, 0.7);
  --el-table-border-color: rgba(50, 123, 157, 0.25);
  --el-table-text-color: #a9cbdc;
  --el-table-header-text-color: #75b6d6;
}

:global(.server-dialog .el-form-item) {
  margin-bottom: 12px;
}

:global(.server-dialog .el-form-item__label) {
  color: #7ea9bf;
  font-size: 11px;
}

:global(.server-dialog .el-input-number) {
  width: 100%;
}

@media (max-width: 720px) {
  .manager-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-actions :deep(.el-button) {
    flex: 1;
  }

  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 440px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
