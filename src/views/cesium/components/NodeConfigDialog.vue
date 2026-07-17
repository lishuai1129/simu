<template>
  <el-dialog
    v-model="visible"
    class="node-config-dialog"
    modal-class="node-config-overlay"
    width="min(700px, calc(100vw - 28px))"
    append-to-body
    :close-on-click-modal="false"
    destroy-on-close
    @open="initializeDialog"
    @closed="resetDialog"
  >
    <template #header>
      <div class="dialog-title">
        <span class="title-icon"><el-icon :size="19"><Aim /></el-icon></span>
        <div>
          <h2>{{ isEditing ? '节点信息' : mode === 'batch' ? '批量部署节点' : '配置节点' }}</h2>
          <p>{{ typeInfo.label }} · {{ typeInfo.code }}</p>
        </div>
      </div>
    </template>

    <el-form
      ref="formRef"
      class="node-form"
      :model="form"
      :rules="formRules"
      label-position="top"
      @submit.prevent="submitNode"
    >
      <div class="type-location-bar">
        <div class="node-type-display">
          <span class="type-icon"><el-icon><component :is="typeInfo.icon" /></el-icon></span>
          <div>
            <span>节点类型</span>
            <strong>{{ typeInfo.label }}</strong>
          </div>
        </div>
        <div class="position-display">
          <span>{{ isEditing ? '当前坐标' : '放置坐标' }}</span>
          <strong>{{ coordinateText }}</strong>
        </div>
      </div>

      <div v-if="isEditing" class="node-details">
        <div><span>节点 ID</span><strong>{{ node?.id }}</strong></div>
        <div><span>场景 ID</span><strong>{{ node?.sessionId }}</strong></div>
        <div><span>CORE 节点 ID</span><strong>{{ node?.coreNodeId ?? '-' }}</strong></div>
        <div><span>镜像</span><strong>{{ node?.image || '-' }}</strong></div>
        <div><span>vCPU</span><strong>{{ node?.vcpus ?? '-' }}</strong></div>
        <div><span>内存</span><strong>{{ node?.memory ? `${node.memory} MB` : '-' }}</strong></div>
      </div>

      <div v-if="isEditing || mode === 'single'" class="form-grid two-columns">
        <el-form-item label="节点名称" prop="name">
          <el-input v-model="form.name" maxlength="64" placeholder="请输入节点名称" />
        </el-form-item>
        <el-form-item label="所在服务器" prop="serverId">
          <el-select v-model="form.serverId" placeholder="自动调度" clearable filterable>
            <el-option label="自动调度" value="" />
            <el-option
              v-for="server in serverStore.servers"
              :key="server.id"
              :label="`${server.name} · ${server.host}`"
              :value="server.id"
            />
          </el-select>
        </el-form-item>
      </div>

      <div v-else class="form-grid batch-grid">
        <el-form-item label="名称前缀" prop="prefix">
          <el-input v-model="form.prefix" maxlength="48" placeholder="node" />
        </el-form-item>
        <el-form-item label="数量" prop="count">
          <el-input-number v-model="form.count" :min="1" :max="200" controls-position="right" />
        </el-form-item>
        <el-form-item label="起始序号" prop="startIndex">
          <el-input-number v-model="form.startIndex" :min="0" :max="9999" controls-position="right" />
        </el-form-item>
        <el-form-item label="节点间距（公里）" prop="spacingKm">
          <el-input-number
            v-model="form.spacingKm"
            :min="0.1"
            :max="1000"
            :step="1"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item class="batch-server" label="所在服务器" prop="serverId">
          <el-select v-model="form.serverId" placeholder="自动调度" clearable filterable>
            <el-option label="自动调度" value="" />
            <el-option
              v-for="server in serverStore.servers"
              :key="server.id"
              :label="`${server.name} · ${server.host}`"
              :value="server.id"
            />
          </el-select>
        </el-form-item>
      </div>

      <div v-if="!isEditing && needsImage" class="form-grid two-columns">
        <el-form-item
          :label="currentNodeType === 'QEMU' ? 'QEMU 镜像路径' : 'Docker 镜像'"
          prop="image"
        >
          <el-input
            v-model="form.image"
            :placeholder="currentNodeType === 'QEMU' ? '/images/ubuntu.qcow2' : 'ubuntu:22.04'"
          />
        </el-form-item>
        <el-form-item label="CORE 节点模型（可选）" prop="model">
          <el-input v-model="form.model" placeholder="可留空" />
        </el-form-item>
      </div>

      <el-form-item v-else-if="!isEditing" label="CORE 节点模型（可选）" prop="model">
        <el-input v-model="form.model" placeholder="可留空" />
      </el-form-item>

      <div v-if="!isEditing && currentNodeType === 'QEMU'" class="form-grid two-columns">
        <el-form-item label="vCPU 数量" prop="vcpus">
          <el-input-number v-model="form.vcpus" :min="1" :max="128" controls-position="right" />
        </el-form-item>
        <el-form-item label="内存（MB）" prop="memory">
          <el-input-number
            v-model="form.memory"
            :min="64"
            :max="1048576"
            :step="256"
            controls-position="right"
          />
        </el-form-item>
      </div>

      <div v-if="isEditing" class="form-grid three-columns">
        <el-form-item label="经度" prop="lon">
          <el-input-number v-model="form.lon" :min="-180" :max="180" :precision="6" controls-position="right" />
        </el-form-item>
        <el-form-item label="纬度" prop="lat">
          <el-input-number v-model="form.lat" :min="-90" :max="90" :precision="6" controls-position="right" />
        </el-form-item>
        <el-form-item label="海拔高度（米）" prop="alt">
          <el-input-number v-model="form.alt" :min="0" :max="100000" :step="10" controls-position="right" />
        </el-form-item>
      </div>

      <div v-else class="form-grid two-columns">
        <el-form-item label="海拔高度（米）" prop="alt">
          <el-input-number v-model="form.alt" :min="0" :max="100000" :step="10" controls-position="right" />
        </el-form-item>
        <el-form-item label="计划连接节点（可选）" prop="connectTo">
          <el-select
            v-model="form.connectTo"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择已有节点"
          >
            <el-option
              v-for="node in topoStore.nodes"
              :key="node.id"
              :label="node.name"
              :value="node.id"
            />
          </el-select>
        </el-form-item>
      </div>

      <div v-if="batchErrors.length" class="batch-errors" role="alert">
        <strong>部分节点添加失败</strong>
        <span v-for="(error, index) in batchErrors" :key="`${index}-${error}`">{{ error }}</span>
      </div>

      <div class="dialog-actions">
        <el-button
          v-if="isEditing"
          class="delete-button"
          type="danger"
          plain
          :loading="deleting"
          :disabled="submitting"
          @click="removeCurrentNode"
        >
          <el-icon><Delete /></el-icon>
          删除节点
        </el-button>
        <span class="action-spacer"></span>
        <el-button :disabled="submitting || deleting" @click="visible = false">取消</el-button>
        <el-button
          type="primary"
          native-type="button"
          :loading="submitting"
          :disabled="deleting"
          @click="submitNode"
        >
          {{ isEditing ? '保存修改' : mode === 'batch' ? `部署 ${form.count} 个节点` : '确认放置' }}
        </el-button>
      </div>
    </el-form>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

import {
  addNode,
  addNodesBatch,
  deleteNode,
  type AddNodePayload,
  type NodeType,
  type SimulationNode,
  type UpdateNodePayload,
  updateNode,
} from '@/api/node'
import { useServerStore } from '@/stores/servers'
import { useTopoStore } from '@/stores/topo'
import type { GeoPosition, PlacementMode } from '@/views/cesium/types'

defineOptions({ name: 'NodeConfigDialog' })

const props = defineProps<{
  node?: SimulationNode | null
  nodeType: NodeType
  mode: PlacementMode
  position: GeoPosition | null
}>()

const emit = defineEmits<{
  success: [nodes: SimulationNode[]]
  updated: [node: SimulationNode]
  deleted: [nodeId: string]
  closed: []
}>()

interface NodeFormModel {
  name: string
  prefix: string
  count: number
  startIndex: number
  spacingKm: number
  serverId: string
  image: string
  model: string
  vcpus: number
  memory: number
  lon: number
  lat: number
  alt: number
  connectTo: string[]
}

const visible = defineModel<boolean>({ default: false })
const formRef = ref<FormInstance>()
const topoStore = useTopoStore()
const serverStore = useServerStore()
const submitting = ref(false)
const deleting = ref(false)
const batchErrors = ref<string[]>([])

const typeMeta: Record<NodeType, { label: string; code: string; prefix: string; icon: string }> = {
  DEFAULT: { label: '路由器', code: 'DEFAULT', prefix: 'r', icon: 'Connection' },
  SWITCH: { label: '交换机', code: 'SWITCH', prefix: 'sw', icon: 'Switch' },
  HUB: { label: '集线器', code: 'HUB', prefix: 'hub', icon: 'Share' },
  WIRELESS_LAN: { label: '无线局域网', code: 'WIRELESS_LAN', prefix: 'wlan', icon: 'Platform' },
  DOCKER: { label: 'Docker 容器', code: 'DOCKER', prefix: 'd', icon: 'Box' },
  QEMU: { label: 'QEMU 虚拟机', code: 'QEMU', prefix: 'vm', icon: 'Monitor' },
}

const currentNodeType = computed(() => props.node?.nodeType ?? props.nodeType)
const isEditing = computed(() => Boolean(props.node))

const defaultForm = (): NodeFormModel => ({
  name: '',
  prefix: typeMeta[currentNodeType.value].prefix,
  count: 5,
  startIndex: 1,
  spacingKm: 20,
  serverId: '',
  image: '',
  model: '',
  vcpus: 2,
  memory: 2048,
  lon: props.node?.lon ?? props.position?.lon ?? 0,
  lat: props.node?.lat ?? props.position?.lat ?? 0,
  alt: props.node?.alt ?? props.position?.alt ?? 0,
  connectTo: [],
})

const form = reactive<NodeFormModel>(defaultForm())
const typeInfo = computed(() => typeMeta[currentNodeType.value])
const needsImage = computed(() => currentNodeType.value === 'DOCKER' || currentNodeType.value === 'QEMU')
const mode = computed(() => props.mode)

const coordinateText = computed(() => {
  const position = props.node ?? props.position
  if (!position) return '-'
  return `${position.lon.toFixed(5)}, ${position.lat.toFixed(5)}`
})

const formRules = computed<FormRules<NodeFormModel>>(() => ({
  name:
    isEditing.value || props.mode === 'single'
      ? [{ required: true, message: '请输入节点名称', trigger: 'blur' }]
      : [],
  prefix: props.mode === 'batch' ? [{ required: true, message: '请输入名称前缀', trigger: 'blur' }] : [],
  image:
    !isEditing.value && needsImage.value
      ? [{ required: true, message: '该节点类型必须指定镜像', trigger: 'blur' }]
      : [],
  vcpus:
    !isEditing.value && currentNodeType.value === 'QEMU'
      ? [{ required: true, message: '请输入 vCPU 数量', trigger: 'change' }]
      : [],
  memory:
    !isEditing.value && currentNodeType.value === 'QEMU'
      ? [{ required: true, message: '请输入内存大小', trigger: 'change' }]
      : [],
}))

async function initializeDialog() {
  Object.assign(form, defaultForm())
  if (props.node) {
    form.name = props.node.name
    form.serverId = props.node.serverId ?? ''
    form.image = props.node.image ?? ''
    form.model = props.node.model ?? ''
    form.vcpus = props.node.vcpus ?? 2
    form.memory = props.node.memory ?? 2048
  } else {
    form.name = `${typeInfo.value.prefix}${topoStore.nodes.length + 1}`
  }
  batchErrors.value = []
  formRef.value?.clearValidate()

  if (!serverStore.servers.length) {
    await serverStore.fetchServers().catch((error) => {
      ElMessage.warning(error instanceof Error ? error.message : '服务器列表加载失败')
    })
  }
}

function resetDialog() {
  Object.assign(form, defaultForm())
  deleting.value = false
  batchErrors.value = []
  formRef.value?.clearValidate()
  emit('closed')
}

function commonPayload(): Omit<AddNodePayload, 'name' | 'lon' | 'lat'> {
  return {
    nodeType: currentNodeType.value,
    serverId: form.serverId || null,
    image: needsImage.value ? form.image.trim() : null,
    model: form.model.trim() || null,
    vcpus: currentNodeType.value === 'QEMU' ? form.vcpus : null,
    memory: currentNodeType.value === 'QEMU' ? form.memory : null,
    alt: form.alt,
    connectTo: form.connectTo,
  }
}

function buildBatchNodes(): AddNodePayload[] {
  if (!props.position) return []

  const columns = Math.ceil(Math.sqrt(form.count))
  const rows = Math.ceil(form.count / columns)
  const latitudeStep = form.spacingKm / 111
  const longitudeScale = Math.max(0.15, Math.cos((props.position.lat * Math.PI) / 180))
  const longitudeStep = form.spacingKm / (111 * longitudeScale)

  return Array.from({ length: form.count }, (_, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    return {
      ...commonPayload(),
      name: `${form.prefix.trim()}${form.startIndex + index}`,
      lon: props.position!.lon + (column - (columns - 1) / 2) * longitudeStep,
      lat: props.position!.lat + (row - (rows - 1) / 2) * latitudeStep,
    }
  })
}

async function submitNode() {
  const sessionId = topoStore.currentSessionId
  if (!sessionId || (!isEditing.value && !props.position) || !formRef.value) {
    ElMessage.error('缺少当前场景或放置坐标')
    return
  }

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  batchErrors.value = []
  try {
    if (props.node) {
      const originalNode = props.node
      const payload: UpdateNodePayload = {}
      const nextName = form.name.trim()
      const nextServerId = form.serverId || null

      if (nextName !== originalNode.name) payload.name = nextName
      if (nextServerId !== originalNode.serverId) payload.serverId = nextServerId
      if (form.lon !== originalNode.lon) payload.lon = form.lon
      if (form.lat !== originalNode.lat) payload.lat = form.lat
      if (form.alt !== originalNode.alt) payload.alt = form.alt

      if (!Object.keys(payload).length) {
        ElMessage.info('节点信息未发生变化')
        return
      }

      const node = await updateNode(sessionId, originalNode.id, payload)
      topoStore.upsertNodes([node])
      emit('updated', node)
      visible.value = false
      ElMessage.success(`节点“${node.name}”修改成功`)
      return
    }

    const position = props.position
    if (!position) {
      ElMessage.error('缺少节点放置坐标')
      return
    }

    if (props.mode === 'single') {
      const node = await addNode(sessionId, {
        ...commonPayload(),
        name: form.name.trim(),
        lon: position.lon,
        lat: position.lat,
      })
      topoStore.upsertNodes([node])
      emit('success', [node])
      visible.value = false
      ElMessage.success(`节点“${node.name}”添加成功`)
      return
    }

    const result = await addNodesBatch(sessionId, { nodes: buildBatchNodes() })
    topoStore.upsertNodes(result.succeeded)
    batchErrors.value = result.errors

    if (result.errors.length) {
      ElMessage.warning(`成功添加 ${result.succeeded.length} 个节点，${result.errors.length} 个失败`)
    } else {
      emit('success', result.succeeded)
      visible.value = false
      ElMessage.success(`成功部署 ${result.succeeded.length} 个节点`)
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '节点添加失败')
  } finally {
    submitting.value = false
  }
}

async function removeCurrentNode() {
  const sessionId = topoStore.currentSessionId
  const node = props.node
  if (!sessionId || !node) return

  try {
    await ElMessageBox.confirm(
      `删除节点“${node.name}”后，其关联链路和接口记录也会被删除。`,
      '删除节点',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'node-delete-confirm',
      },
    )
  } catch {
    return
  }

  deleting.value = true
  try {
    await deleteNode(sessionId, node.id)
    topoStore.setNodes(topoStore.nodes.filter((item) => item.id !== node.id))
    topoStore.setLinks(
      topoStore.links.filter((link) => link.node1Id !== node.id && link.node2Id !== node.id),
    )
    emit('deleted', node.id)
    visible.value = false
    ElMessage.success(`节点“${node.name}”已删除`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '节点删除失败')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.node-form {
  color: #cfe8f7;
}

.dialog-title,
.type-location-bar,
.node-type-display,
.dialog-actions {
  display: flex;
  align-items: center;
}

.dialog-title {
  gap: 11px;
}

.title-icon,
.type-icon {
  display: grid;
  place-items: center;
  color: #61ddff;
}

.title-icon {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(62, 200, 245, 0.5);
  border-radius: 5px;
  background: rgba(12, 104, 148, 0.2);
}

.dialog-title h2 {
  color: #e0f6ff;
  font-size: 17px;
  font-weight: 650;
}

.dialog-title p {
  margin-top: 2px;
  color: #4f91b0;
  font-family: Consolas, monospace;
  font-size: 9px;
}

.type-location-bar {
  min-height: 58px;
  margin-bottom: 14px;
  padding: 9px 12px;
  border: 1px solid rgba(47, 139, 180, 0.32);
  border-radius: 6px;
  justify-content: space-between;
  gap: 20px;
  background: rgba(5, 31, 53, 0.72);
}

.node-type-display {
  gap: 9px;
}

.type-icon {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(59, 167, 211, 0.34);
  border-radius: 5px;
  background: rgba(8, 57, 88, 0.6);
}

.node-type-display > div,
.position-display {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-type-display span,
.position-display span {
  color: #638ea5;
  font-size: 10px;
}

.node-type-display strong {
  color: #d9f2fe;
  font-size: 13px;
}

.position-display {
  align-items: flex-end;
}

.position-display strong {
  color: #73cef2;
  font-family: Consolas, monospace;
  font-size: 12px;
}

.form-grid {
  display: grid;
  gap: 10px;
}

.two-columns {
  grid-template-columns: 1fr 1fr;
}

.three-columns {
  grid-template-columns: repeat(3, 1fr);
}

.node-details {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(47, 139, 180, 0.26);
  border-radius: 6px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 16px;
  background: rgba(3, 22, 40, 0.54);
}

.node-details > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.node-details span {
  color: #638ea5;
  font-size: 10px;
}

.node-details strong {
  overflow: hidden;
  color: #b9dbea;
  font-family: Consolas, monospace;
  font-size: 11px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-grid {
  grid-template-columns: 1.2fr 0.7fr 0.7fr 1fr;
}

.batch-server {
  grid-column: 1 / -1;
}

.dialog-actions {
  margin-top: 8px;
  justify-content: flex-end;
  gap: 8px;
}

.action-spacer {
  flex: 1;
}

.batch-errors {
  max-height: 90px;
  margin-bottom: 12px;
  padding: 9px 11px;
  overflow-y: auto;
  border: 1px solid rgba(255, 122, 113, 0.42);
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: rgba(101, 28, 34, 0.24);
  color: #ffaaa3;
  font-size: 11px;
}

:global(.node-config-overlay) {
  background: rgba(0, 8, 18, 0.66);
  backdrop-filter: blur(3px);
}

:global(.node-config-dialog.el-dialog) {
  --el-bg-color: #06182b;
  --el-bg-color-overlay: #06182b;
  --el-border-color: rgba(50, 143, 183, 0.42);
  --el-border-color-light: rgba(50, 143, 183, 0.28);
  --el-fill-color-blank: rgba(7, 27, 47, 0.9);
  --el-fill-color-light: rgba(15, 49, 73, 0.76);
  --el-text-color-primary: #d7edf8;
  --el-text-color-regular: #9fc2d5;
  --el-text-color-secondary: #7195a9;
  overflow: hidden;
  border: 1px solid rgba(44, 177, 229, 0.5);
  border-radius: 7px;
  background: #06182b;
  box-shadow: 0 22px 70px rgba(0, 4, 12, 0.72);
}

:global(.node-config-dialog .el-dialog__header) {
  margin: 0;
  padding: 15px 18px;
  border-bottom: 1px solid rgba(49, 139, 179, 0.32);
  background: rgba(4, 21, 40, 0.92);
}

:global(.node-config-dialog .el-dialog__body) {
  max-height: calc(100vh - 130px);
  padding: 14px 18px 18px;
  overflow-y: auto;
}

:global(.node-config-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: #78a9c2;
}

:global(.node-config-dialog .el-form-item) {
  margin-bottom: 12px;
}

:global(.node-config-dialog .el-form-item__label) {
  color: #7ea9bf;
  font-size: 11px;
}

:global(.node-config-dialog .el-input-number),
:global(.node-config-dialog .el-select) {
  width: 100%;
}

@media (max-width: 640px) {
  .two-columns,
  .three-columns,
  .batch-grid {
    grid-template-columns: 1fr;
  }

  .node-details {
    grid-template-columns: 1fr 1fr;
  }

  .batch-server {
    grid-column: auto;
  }

  .position-display {
    display: none;
  }
}
</style>
