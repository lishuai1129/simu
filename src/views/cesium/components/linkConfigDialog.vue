<template>
  <el-dialog
    v-model="visible"
    class="link-config-dialog"
    modal-class="link-config-overlay"
    width="min(820px, calc(100vw - 28px))"
    append-to-body
    :close-on-click-modal="false"
    destroy-on-close
    @open="initializeDialog"
    @closed="resetDialog"
  >
    <template #header>
      <div class="dialog-title">
        <span class="title-icon"><el-icon :size="19"><Link /></el-icon></span>
        <div>
          <h2>{{ title }}</h2>
          <p>LINK CONFIGURATION · {{ isEditing ? link?.linkType : mode.toUpperCase() }}</p>
        </div>
      </div>
    </template>

    <div v-if="isEditing" class="link-summary">
      <div class="endpoint">
        <span>节点 A</span>
        <strong>{{ getNodeName(link?.node1Id) }}</strong>
      </div>
      <span class="link-flow" :class="link?.linkType.toLowerCase()">
        <el-icon><Right /></el-icon>
        {{ linkTypeLabel(link?.linkType) }}
        <el-icon v-if="!link?.unidirectional"><Back /></el-icon>
      </span>
      <div class="endpoint align-right">
        <span>节点 B</span>
        <strong>{{ getNodeName(link?.node2Id) }}</strong>
      </div>
    </div>

    <div v-if="isEditing" class="iface-grid">
      <div v-for="(iface, index) in [link?.iface1, link?.iface2]" :key="index" class="iface-card">
        <div class="iface-title">
          <el-icon><Connection /></el-icon>
          <strong>接口 {{ index === 0 ? 'A' : 'B' }}</strong>
          <span>{{ iface?.name || '未分配' }}</span>
        </div>
        <dl>
          <div><dt>接口 ID</dt><dd>{{ iface?.id || '-' }}</dd></div>
          <div><dt>IPv4</dt><dd>{{ formatAddress(iface?.ip4, iface?.ip4Mask) }}</dd></div>
          <div><dt>IPv6</dt><dd>{{ formatAddress(iface?.ip6, iface?.ip6Mask) }}</dd></div>
          <div><dt>MAC</dt><dd>{{ iface?.mac || '-' }}</dd></div>
          <div><dt>MTU</dt><dd>{{ iface?.mtu ?? '-' }}</dd></div>
        </dl>
      </div>
    </div>

    <template v-if="mode === 'batch' && !isEditing">
      <div class="batch-toolbar">
        <div>
          <strong>链路清单</strong>
          <span>共 {{ batchRows.length }} 条</span>
        </div>
        <el-button type="primary" plain @click="addBatchRow">
          <el-icon><Plus /></el-icon>
          添加一行
        </el-button>
      </div>

      <div class="batch-list">
        <section v-for="(row, index) in batchRows" :key="row.key" class="batch-row">
          <header>
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <strong>{{ getNodeName(row.node1Id) }} → {{ getNodeName(row.node2Id) }}</strong>
            <el-button
              circle
              text
              type="danger"
              title="移除该链路"
              :disabled="batchRows.length === 1"
              @click="removeBatchRow(index)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </header>
          <div class="form-grid batch-endpoints">
            <el-select v-model="row.node1Id" filterable placeholder="选择节点 A">
              <el-option v-for="node in topoStore.nodes" :key="node.id" :label="node.name" :value="node.id" />
            </el-select>
            <el-select v-model="row.node2Id" filterable placeholder="选择节点 B">
              <el-option v-for="node in topoStore.nodes" :key="node.id" :label="node.name" :value="node.id" />
            </el-select>
            <el-select v-model="row.linkType" placeholder="链路类型">
              <el-option label="有线链路" value="WIRED" />
              <el-option label="无线链路" value="WIRELESS" />
            </el-select>
          </div>
          <div class="form-grid batch-addresses">
            <el-input v-model="row.ip4" placeholder="节点 A IPv4" />
            <el-input-number v-model="row.ip4Mask" :min="0" :max="32" controls-position="right" />
            <el-input v-model="row.ip4B" placeholder="节点 B IPv4" />
            <el-input-number v-model="row.ip4MaskB" :min="0" :max="32" controls-position="right" />
          </div>
        </section>
      </div>

      <div v-if="batchErrors.length" class="batch-errors" role="alert">
        <strong>部分链路添加失败</strong>
        <span v-for="(error, index) in batchErrors" :key="`${index}-${error}`">{{ error }}</span>
      </div>
    </template>

    <el-form
      v-else
      ref="formRef"
      class="link-form"
      :model="form"
      :rules="formRules"
      label-position="top"
      @submit.prevent="submitLink"
    >
      <div class="section-title"><span>01</span><strong>端点与类型</strong></div>
      <div class="form-grid endpoint-grid">
        <el-form-item label="节点 A" prop="node1Id">
          <el-select v-model="form.node1Id" filterable placeholder="请选择节点" :disabled="isEditing">
            <el-option v-for="node in topoStore.nodes" :key="node.id" :label="node.name" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="节点 B" prop="node2Id">
          <el-select v-model="form.node2Id" filterable placeholder="请选择节点" :disabled="isEditing">
            <el-option v-for="node in topoStore.nodes" :key="node.id" :label="node.name" :value="node.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="链路类型" prop="linkType">
          <el-radio-group v-model="form.linkType">
            <el-radio-button value="WIRED">有线</el-radio-button>
            <el-radio-button value="WIRELESS">无线</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </div>

      <div class="section-title"><span>02</span><strong>网络地址</strong></div>
      <div class="address-panel">
        <div class="address-row">
          <span class="address-side">A</span>
          <el-form-item label="IPv4">
            <el-input v-model="form.ip4" placeholder="10.0.1.1" />
          </el-form-item>
          <el-form-item label="掩码">
            <el-input-number v-model="form.ip4Mask" :min="0" :max="32" controls-position="right" />
          </el-form-item>
          <el-form-item label="IPv6">
            <el-input v-model="form.ip6" placeholder="可留空" />
          </el-form-item>
          <el-form-item label="掩码">
            <el-input-number v-model="form.ip6Mask" :min="0" :max="128" controls-position="right" />
          </el-form-item>
        </div>
        <div class="address-row">
          <span class="address-side">B</span>
          <el-form-item label="IPv4">
            <el-input v-model="form.ip4B" placeholder="10.0.1.2" />
          </el-form-item>
          <el-form-item label="掩码">
            <el-input-number v-model="form.ip4MaskB" :min="0" :max="32" controls-position="right" />
          </el-form-item>
          <el-form-item label="IPv6">
            <el-input v-model="form.ip6B" placeholder="可留空" />
          </el-form-item>
          <el-form-item label="掩码">
            <el-input-number v-model="form.ip6MaskB" :min="0" :max="128" controls-position="right" />
          </el-form-item>
        </div>
      </div>

      <div class="section-title"><span>03</span><strong>链路质量</strong></div>
      <div class="form-grid quality-grid">
        <el-form-item label="带宽上限（bps）">
          <el-input-number v-model="form.bandwidth" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="延迟（ms）">
          <el-input-number v-model="form.delay" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="丢包率（%）">
          <el-input-number v-model="form.loss" :min="0" :max="100" :step="0.1" controls-position="right" />
        </el-form-item>
        <el-form-item label="抖动（ms）">
          <el-input-number v-model="form.jitter" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="重复包率（%）">
          <el-input-number v-model="form.dup" :min="0" :max="100" controls-position="right" />
        </el-form-item>
        <el-form-item label="缓冲队列大小">
          <el-input-number v-model="form.buffer" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item class="direction-item" label="传输方向">
          <el-switch
            v-model="form.unidirectional"
            inline-prompt
            active-text="单向"
            inactive-text="双向"
          />
        </el-form-item>
      </div>
    </el-form>

    <div class="dialog-actions">
      <el-button
        v-if="isEditing"
        type="danger"
        plain
        :loading="deleting"
        :disabled="submitting"
        @click="removeCurrentLink"
      >
        <el-icon><Delete /></el-icon>
        删除链路
      </el-button>
      <span class="action-spacer"></span>
      <el-button :disabled="submitting || deleting" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="deleting" @click="submitLink">
        {{ submitText }}
      </el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

import {
  addLink,
  addLinksBatch,
  deleteLink,
  type LinkPayload,
  type LinkType,
  type SimulationLink,
  updateLink,
} from '@/api/link'
import { useTopoStore } from '@/stores/topo'
import type { PlacementMode } from '@/views/cesium/types'

defineOptions({ name: 'LinkConfigDialog' })

const props = defineProps<{
  link?: SimulationLink | null
  mode: PlacementMode
  initialNode1Id?: string | null
  initialNode2Id?: string | null
}>()

const emit = defineEmits<{
  success: [links: SimulationLink[]]
  updated: [linkId: string]
  deleted: [linkId: string]
  closed: []
}>()

interface LinkFormModel {
  node1Id: string
  node2Id: string
  linkType: LinkType
  ip4: string
  ip4Mask: number | null
  ip4B: string
  ip4MaskB: number | null
  ip6: string
  ip6Mask: number | null
  ip6B: string
  ip6MaskB: number | null
  bandwidth: number | null
  delay: number | null
  loss: number | null
  jitter: number | null
  dup: number | null
  unidirectional: boolean
  buffer: number | null
}

interface BatchLinkRow {
  key: number
  node1Id: string
  node2Id: string
  linkType: LinkType
  ip4: string
  ip4Mask: number | null
  ip4B: string
  ip4MaskB: number | null
}

const visible = defineModel<boolean>({ default: false })
const topoStore = useTopoStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const deleting = ref(false)
const batchErrors = ref<string[]>([])
const batchRows = ref<BatchLinkRow[]>([])
let batchRowKey = 0

const isEditing = computed(() => Boolean(props.link))
const title = computed(() => {
  if (isEditing.value) return '链路信息'
  return props.mode === 'batch' ? '批量添加链路' : '添加链路'
})
const submitText = computed(() => {
  if (isEditing.value) return '保存修改'
  return props.mode === 'batch' ? `创建 ${batchRows.value.length} 条链路` : '创建链路'
})

function defaultIpv4Pair(sequence: number) {
  const index = Math.max(1, sequence) - 1
  const secondOctet = Math.floor(index / 254) % 254
  const thirdOctet = (index % 254) + 1
  return {
    nodeA: `10.${secondOctet}.${thirdOctet}.1`,
    nodeB: `10.${secondOctet}.${thirdOctet}.2`,
  }
}

const defaultForm = (): LinkFormModel => {
  const addresses = defaultIpv4Pair(topoStore.links.length + 1)
  return {
    node1Id: '',
    node2Id: '',
    linkType: 'WIRED',
    ip4: addresses.nodeA,
    ip4Mask: 24,
    ip4B: addresses.nodeB,
    ip4MaskB: 24,
    ip6: '',
    ip6Mask: null,
    ip6B: '',
    ip6MaskB: null,
    bandwidth: null,
    delay: null,
    loss: null,
    jitter: null,
    dup: null,
    unidirectional: false,
    buffer: null,
  }
}

const form = reactive<LinkFormModel>(defaultForm())
const formRules: FormRules<LinkFormModel> = {
  node1Id: [{ required: true, message: '请选择节点 A', trigger: 'change' }],
  node2Id: [
    { required: true, message: '请选择节点 B', trigger: 'change' },
    {
      validator: (_rule, value, callback) => {
        if (value && value === form.node1Id) callback(new Error('链路两端不能是同一个节点'))
        else callback()
      },
      trigger: 'change',
    },
  ],
}

function newBatchRow(index = batchRows.value.length): BatchLinkRow {
  const nodeCount = topoStore.nodes.length
  const node1 = nodeCount ? (topoStore.nodes[index % nodeCount]?.id ?? '') : ''
  const node2 = nodeCount > 1 ? (topoStore.nodes[(index + 1) % nodeCount]?.id ?? '') : ''
  const addresses = defaultIpv4Pair(topoStore.links.length + index + 1)
  return {
    key: ++batchRowKey,
    node1Id: node1,
    node2Id: node2,
    linkType: 'WIRED',
    ip4: addresses.nodeA,
    ip4Mask: 24,
    ip4B: addresses.nodeB,
    ip4MaskB: 24,
  }
}

function initializeDialog() {
  Object.assign(form, defaultForm())
  batchErrors.value = []
  deleting.value = false

  if (props.link) {
    const link = props.link
    const linkIndex = topoStore.links.findIndex((item) => item.id === link.id)
    const addresses = defaultIpv4Pair(linkIndex >= 0 ? linkIndex + 1 : topoStore.links.length + 1)
    Object.assign(form, {
      node1Id: link.node1Id,
      node2Id: link.node2Id,
      linkType: link.linkType,
      ip4: link.iface1?.ip4 ?? addresses.nodeA,
      ip4Mask: link.iface1?.ip4Mask ?? 24,
      ip4B: link.iface2?.ip4 ?? addresses.nodeB,
      ip4MaskB: link.iface2?.ip4Mask ?? 24,
      ip6: link.iface1?.ip6 ?? '',
      ip6Mask: link.iface1?.ip6Mask ?? null,
      ip6B: link.iface2?.ip6 ?? '',
      ip6MaskB: link.iface2?.ip6Mask ?? null,
      bandwidth: link.bandwidth ?? null,
      delay: link.delay ?? null,
      loss: link.loss ?? null,
      jitter: link.jitter ?? null,
      dup: link.dup ?? null,
      unidirectional: link.unidirectional ?? false,
      buffer: link.buffer ?? null,
    })
  } else if (props.mode === 'single') {
    form.node1Id = props.initialNode1Id ?? topoStore.nodes[0]?.id ?? ''
    form.node2Id = props.initialNode2Id ?? topoStore.nodes[1]?.id ?? ''
  }

  const initialBatchSize = Math.min(2, Math.max(1, topoStore.nodes.length - 1))
  batchRows.value =
    props.mode === 'batch' && !props.link
      ? Array.from({ length: initialBatchSize }, (_, index) => newBatchRow(index))
      : []
  formRef.value?.clearValidate()
}

function resetDialog() {
  Object.assign(form, defaultForm())
  batchRows.value = []
  batchErrors.value = []
  submitting.value = false
  deleting.value = false
  formRef.value?.clearValidate()
  emit('closed')
}

function getNodeName(nodeId?: string | null) {
  if (!nodeId) return '未选择'
  return topoStore.nodes.find((node) => node.id === nodeId)?.name ?? nodeId
}

function linkTypeLabel(type?: LinkType) {
  return type === 'WIRELESS' ? '无线链路' : '有线链路'
}

function formatAddress(address?: string | null, mask?: number | null) {
  if (!address) return '-'
  return mask === null || mask === undefined ? address : `${address}/${mask}`
}

function optionalText(value: string) {
  return value.trim() || null
}

function buildPayload(): LinkPayload {
  return {
    node1Id: form.node1Id,
    node2Id: form.node2Id,
    linkType: form.linkType,
    ip4: optionalText(form.ip4),
    ip4Mask: form.ip4 ? form.ip4Mask : null,
    ip4B: optionalText(form.ip4B),
    ip4MaskB: form.ip4B ? form.ip4MaskB : null,
    ip6: optionalText(form.ip6),
    ip6Mask: form.ip6 ? form.ip6Mask : null,
    ip6B: optionalText(form.ip6B),
    ip6MaskB: form.ip6B ? form.ip6MaskB : null,
    bandwidth: form.bandwidth,
    delay: form.delay,
    loss: form.loss,
    jitter: form.jitter,
    dup: form.dup,
    unidirectional: form.unidirectional,
    buffer: form.buffer,
  }
}

function buildBatchPayload(row: BatchLinkRow): LinkPayload {
  return {
    node1Id: row.node1Id,
    node2Id: row.node2Id,
    linkType: row.linkType,
    ip4: optionalText(row.ip4),
    ip4Mask: row.ip4 ? row.ip4Mask : null,
    ip4B: optionalText(row.ip4B),
    ip4MaskB: row.ip4B ? row.ip4MaskB : null,
  }
}

function addBatchRow() {
  batchRows.value.push(newBatchRow())
}

function removeBatchRow(index: number) {
  if (batchRows.value.length > 1) batchRows.value.splice(index, 1)
}

function validateBatchRows() {
  const invalidIndex = batchRows.value.findIndex(
    (row) => !row.node1Id || !row.node2Id || row.node1Id === row.node2Id,
  )
  if (invalidIndex < 0) return true
  ElMessage.warning(`第 ${invalidIndex + 1} 条链路的端点未选择或两端相同`)
  return false
}

async function refreshLinks() {
  await topoStore.fetchLinks().catch(() => undefined)
}

async function submitLink() {
  const sessionId = topoStore.currentSessionId
  if (!sessionId) {
    ElMessage.error('缺少当前场景')
    return
  }

  batchErrors.value = []
  if (props.mode === 'batch' && !props.link) {
    if (!validateBatchRows()) return
    submitting.value = true
    try {
      const result = await addLinksBatch(sessionId, {
        links: batchRows.value.map(buildBatchPayload),
      })
      topoStore.upsertLinks(result.succeeded)
      await refreshLinks()
      batchErrors.value = result.errors
      emit('success', result.succeeded)
      if (result.errors.length) {
        ElMessage.warning(`成功添加 ${result.succeeded.length} 条链路，${result.errors.length} 条失败`)
      } else {
        visible.value = false
        ElMessage.success(`成功添加 ${result.succeeded.length} 条链路`)
      }
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '批量添加链路失败')
    } finally {
      submitting.value = false
    }
    return
  }

  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (props.link) {
      await updateLink(sessionId, props.link.id, buildPayload())
      await refreshLinks()
      emit('updated', props.link.id)
      visible.value = false
      ElMessage.success('链路修改成功')
    } else {
      const link = await addLink(sessionId, buildPayload())
      topoStore.upsertLinks([link])
      await refreshLinks()
      emit('success', [link])
      visible.value = false
      ElMessage.success('链路添加成功')
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '链路保存失败')
  } finally {
    submitting.value = false
  }
}

async function removeCurrentLink() {
  const sessionId = topoStore.currentSessionId
  const link = props.link
  if (!sessionId || !link) return

  try {
    await ElMessageBox.confirm(
      `确认删除“${getNodeName(link.node1Id)} - ${getNodeName(link.node2Id)}”链路？`,
      '删除链路',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  deleting.value = true
  try {
    await deleteLink(sessionId, link.id)
    topoStore.setLinks(topoStore.links.filter((item) => item.id !== link.id))
    emit('deleted', link.id)
    visible.value = false
    ElMessage.success('链路已删除')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '链路删除失败')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.dialog-title,
.link-summary,
.iface-title,
.batch-toolbar,
.batch-row header,
.section-title,
.dialog-actions {
  display: flex;
  align-items: center;
}

.dialog-title {
  gap: 11px;
}

.title-icon {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(62, 200, 245, 0.5);
  border-radius: 5px;
  display: grid;
  place-items: center;
  background: rgba(12, 104, 148, 0.2);
  color: #61ddff;
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

.link-summary {
  min-height: 58px;
  margin-bottom: 12px;
  padding: 9px 13px;
  border: 1px solid rgba(47, 139, 180, 0.34);
  border-radius: 6px;
  justify-content: space-between;
  background: rgba(5, 31, 53, 0.72);
}

.endpoint {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.endpoint span,
.iface-title span,
.batch-toolbar span {
  color: #638ea5;
  font-size: 10px;
}

.endpoint strong {
  color: #d9f2fe;
  font-size: 13px;
}

.align-right {
  align-items: flex-end;
}

.link-flow {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #53dbff;
  font-size: 11px;
}

.link-flow.wireless {
  color: #f4c95d;
}

.iface-grid {
  margin-bottom: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.iface-card {
  padding: 10px 12px;
  border: 1px solid rgba(41, 123, 160, 0.27);
  border-radius: 6px;
  background: rgba(3, 22, 40, 0.54);
}

.iface-title {
  gap: 7px;
  color: #64d8ff;
}

.iface-title strong {
  color: #cceafa;
  font-size: 11px;
}

.iface-title span {
  margin-left: auto;
}

.iface-card dl {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 14px;
}

.iface-card dl div {
  min-width: 0;
}

.iface-card dt {
  color: #557f94;
  font-size: 9px;
}

.iface-card dd {
  overflow: hidden;
  color: #a9cfdf;
  font-family: Consolas, monospace;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-grid {
  display: grid;
  gap: 10px;
}

.endpoint-grid {
  grid-template-columns: 1fr 1fr 0.8fr;
}

.section-title {
  margin: 4px 0 9px;
  gap: 7px;
  color: #93c5da;
}

.section-title span {
  color: #33bfe9;
  font-family: Consolas, monospace;
  font-size: 10px;
}

.section-title strong {
  font-size: 11px;
}

.address-panel {
  margin-bottom: 12px;
  padding: 9px;
  border: 1px solid rgba(37, 111, 147, 0.24);
  border-radius: 6px;
  background: rgba(2, 19, 35, 0.42);
}

.address-row {
  display: grid;
  grid-template-columns: 28px 1.25fr 0.65fr 1.25fr 0.65fr;
  gap: 8px;
  align-items: end;
}

.address-row + .address-row {
  margin-top: 3px;
  padding-top: 8px;
  border-top: 1px solid rgba(39, 111, 145, 0.18);
}

.address-side {
  width: 25px;
  height: 25px;
  margin-bottom: 12px;
  border: 1px solid rgba(48, 180, 224, 0.4);
  border-radius: 4px;
  display: grid;
  place-items: center;
  background: rgba(8, 75, 108, 0.38);
  color: #6bddff;
  font: 600 11px Consolas, monospace;
}

.quality-grid {
  grid-template-columns: repeat(4, 1fr);
}

.direction-item {
  grid-column: span 2;
}

.batch-toolbar {
  margin-bottom: 10px;
  justify-content: space-between;
}

.batch-toolbar > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.batch-toolbar strong {
  color: #cceafa;
  font-size: 12px;
}

.batch-list {
  max-height: min(54vh, 470px);
  padding-right: 4px;
  overflow-y: auto;
}

.batch-row {
  padding: 9px 11px 11px;
  border: 1px solid rgba(40, 126, 168, 0.3);
  border-radius: 6px;
  background: rgba(3, 26, 48, 0.7);
}

.batch-row + .batch-row {
  margin-top: 8px;
}

.batch-row header {
  min-height: 26px;
  gap: 8px;
}

.batch-row header > span {
  color: #3ec9ef;
  font: 600 10px Consolas, monospace;
}

.batch-row header strong {
  flex: 1;
  color: #9cc8da;
  font-size: 10px;
  font-weight: 500;
}

.batch-endpoints {
  grid-template-columns: 1fr 1fr 0.7fr;
}

.batch-addresses {
  margin-top: 7px;
  grid-template-columns: 1fr 0.45fr 1fr 0.45fr;
}

.batch-errors {
  max-height: 88px;
  margin-top: 10px;
  padding: 8px 10px;
  overflow-y: auto;
  border: 1px solid rgba(255, 122, 113, 0.42);
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: rgba(101, 28, 34, 0.24);
  color: #ffaaa3;
  font-size: 10px;
}

.dialog-actions {
  margin-top: 13px;
  gap: 8px;
}

.action-spacer {
  flex: 1;
}

:global(.link-config-overlay) {
  background: rgba(0, 8, 18, 0.66);
  backdrop-filter: blur(3px);
}

:global(.link-config-dialog.el-dialog) {
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

:global(.link-config-dialog .el-dialog__header) {
  margin: 0;
  padding: 15px 18px;
  border-bottom: 1px solid rgba(49, 139, 179, 0.32);
  background: rgba(4, 21, 40, 0.92);
}

:global(.link-config-dialog .el-dialog__body) {
  max-height: calc(100vh - 120px);
  padding: 14px 18px 16px;
  overflow-y: auto;
}

:global(.link-config-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: #78a9c2;
}

:global(.link-config-dialog .el-form-item) {
  margin-bottom: 10px;
}

:global(.link-config-dialog .el-form-item__label) {
  color: #7ea9bf;
  font-size: 10px;
}

:global(.link-config-dialog .el-input-number),
:global(.link-config-dialog .el-select),
:global(.link-config-dialog .el-radio-group) {
  width: 100%;
}

:global(.link-config-dialog .el-radio-button) {
  width: 50%;
}

:global(.link-config-dialog .el-radio-button__inner) {
  width: 100%;
}

@media (max-width: 700px) {
  .endpoint-grid,
  .quality-grid,
  .batch-endpoints,
  .batch-addresses {
    grid-template-columns: 1fr 1fr;
  }

  .address-row {
    grid-template-columns: 28px 1fr 0.7fr;
  }

  .address-row > :nth-child(4),
  .address-row > :nth-child(5) {
    display: none;
  }

  .iface-grid {
    grid-template-columns: 1fr;
  }
}
</style>
