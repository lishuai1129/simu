<template>
  <aside class="node-sidebar" :class="{ collapsed: !expanded }">
    <button class="sidebar-heading" type="button" @click="expanded = !expanded">
      <span class="heading-mark"><el-icon><Grid /></el-icon></span>
      <strong>节点管理</strong>
      <el-icon class="heading-arrow" :class="{ rotated: !expanded }"><ArrowDown /></el-icon>
    </button>

    <div v-show="expanded" class="sidebar-content">
      <div class="mode-switch" aria-label="节点添加模式">
        <button
          type="button"
          :class="{ active: placementMode === 'single' }"
          @click="placementMode = 'single'"
        >
          单个放置
        </button>
        <button
          type="button"
          :class="{ active: placementMode === 'batch' }"
          @click="placementMode = 'batch'"
        >
          批量部署
        </button>
      </div>

      <div class="node-grid">
        <button
          v-for="item in nodeTypes"
          :key="item.value"
          class="node-item"
          :class="{ active: activeType === item.value }"
          type="button"
          :disabled="disabled"
          @click="selectNodeType(item.value)"
        >
          <span class="node-icon">
            <el-icon :size="21"><component :is="item.icon" /></el-icon>
          </span>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div v-if="activeType" class="placement-tip">
        <span class="pulse-dot" aria-hidden="true"></span>
        <span>请在地图上点击放置位置</span>
        <button type="button" title="取消放置" @click="emit('cancel')">
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </div>

    <div class="manager-section">
      <button class="sidebar-heading" type="button" @click="linkExpanded = !linkExpanded">
        <span class="heading-mark"><el-icon><Connection /></el-icon></span>
        <strong>链路管理</strong>
        <el-icon class="heading-arrow" :class="{ rotated: !linkExpanded }"><ArrowDown /></el-icon>
      </button>

      <div v-show="linkExpanded" class="sidebar-content">
        <div class="link-action-grid">
          <button
            class="node-item link-action"
            :class="{ active: linkSelecting }"
            type="button"
            :disabled="disabled"
            @click="emit('configureLink', 'single')"
          >
            <span class="node-icon"><el-icon :size="21"><Link /></el-icon></span>
            <span>添加链路</span>
          </button>
          <button
            class="node-item link-action"
            type="button"
            :disabled="disabled"
            @click="emit('configureLink', 'batch')"
          >
            <span class="node-icon"><el-icon :size="21"><Operation /></el-icon></span>
            <span>批量链接</span>
          </button>
        </div>
        <div v-if="linkSelecting" class="placement-tip link-selection-tip">
          <span class="pulse-dot" aria-hidden="true"></span>
          <span>{{ linkSelectionCount ? '请选择第二个节点' : '请选择第一个节点' }}</span>
          <small>右键取消</small>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import type { NodeType } from '@/api/node'
import type { NodePlacementRequest, PlacementMode } from '@/views/cesium/types'

defineOptions({ name: 'CesiumSidebar' })

defineProps<{
  activeType?: NodeType | null
  disabled?: boolean
  linkSelecting?: boolean
  linkSelectionCount?: number
}>()

const emit = defineEmits<{
  select: [request: NodePlacementRequest]
  cancel: []
  configureLink: [mode: PlacementMode]
}>()

const expanded = ref(true)
const linkExpanded = ref(true)
const placementMode = ref<PlacementMode>('single')

const nodeTypes: Array<{ value: NodeType; label: string; icon: string }> = [
  { value: 'DEFAULT', label: '路由器', icon: 'Connection' },
  { value: 'SWITCH', label: '交换机', icon: 'Switch' },
  { value: 'QEMU', label: '虚拟机', icon: 'Monitor' },
  { value: 'WIRELESS_LAN', label: '无线局域网', icon: 'Platform' },
  { value: 'DOCKER', label: 'Docker', icon: 'Box' },
  { value: 'HUB', label: '集线器', icon: 'Share' },
]

function selectNodeType(nodeType: NodeType) {
  emit('select', { nodeType, mode: placementMode.value })
}
</script>

<style scoped>
.node-sidebar {
  position: absolute;
  top: 82px;
  bottom: 0;
  left: 0;
  z-index: 24;
  width: 196px;
  padding: 10px 9px 18px;
  overflow-x: hidden;
  overflow-y: auto;
  border-right: 1px solid rgba(36, 156, 209, 0.5);
  background: rgba(2, 15, 38, 0.97);
  color: #d5efff;
  box-shadow:
    8px 0 24px rgba(0, 5, 14, 0.36),
    inset 0 1px rgba(96, 210, 255, 0.06);
  backdrop-filter: blur(9px);
  scrollbar-color: #147bab rgba(5, 30, 60, 0.8);
  scrollbar-width: thin;
}

.node-sidebar.collapsed {
  width: 196px;
}

.node-sidebar::after {
  position: fixed;
  top: 91px;
  bottom: 9px;
  left: 190px;
  width: 3px;
  border-radius: 3px;
  background: rgba(24, 127, 174, 0.58);
  box-shadow: 0 0 8px rgba(35, 174, 226, 0.34);
  content: '';
  pointer-events: none;
}

.node-sidebar::-webkit-scrollbar {
  width: 4px;
}

.node-sidebar::-webkit-scrollbar-track {
  background: rgba(5, 30, 60, 0.8);
}

.node-sidebar::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: #147bab;
}

.sidebar-heading {
  width: 100%;
  height: 40px;
  padding: 0 11px;
  border: 1px solid rgba(34, 126, 174, 0.4);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(5, 38, 80, 0.94);
  color: #d8f4ff;
  font: inherit;
  cursor: pointer;
}

.sidebar-heading strong {
  flex: 1;
  text-align: left;
  font-size: 13px;
  font-weight: 650;
}

.heading-mark {
  color: #5bd9ff;
}

.heading-arrow {
  color: #65a6c7;
  transition: transform 160ms ease;
}

.heading-arrow.rotated {
  transform: rotate(-90deg);
}

.sidebar-content {
  margin-top: 7px;
  padding: 8px;
  border: 1px solid rgba(31, 105, 149, 0.28);
  border-radius: 8px;
  background: rgba(3, 25, 57, 0.76);
}

.manager-section {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(37, 119, 160, 0.24);
}

.link-action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.link-action {
  height: 66px;
}

.link-selection-tip small {
  color: #567f94;
  font-size: 9px;
}

.mode-switch {
  height: 30px;
  margin-bottom: 9px;
  padding: 2px;
  border: 1px solid rgba(45, 131, 171, 0.28);
  border-radius: 5px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: rgba(2, 14, 31, 0.7);
}

.mode-switch button {
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #628ca5;
  font-size: 10px;
  cursor: pointer;
}

.mode-switch button.active {
  background: rgba(17, 116, 164, 0.3);
  color: #74dcff;
}

.node-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.node-item {
  min-width: 0;
  height: 68px;
  padding: 7px 4px;
  border: 1px solid rgba(38, 116, 158, 0.28);
  border-radius: 7px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: rgba(4, 32, 69, 0.88);
  color: #b9d7e8;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    color 150ms ease,
    transform 150ms ease;
}

.node-item:hover:not(:disabled) {
  border-color: rgba(72, 201, 247, 0.65);
  background: rgba(10, 64, 104, 0.88);
  color: #e1f7ff;
  transform: translateY(-1px);
}

.node-item.active {
  border-color: #40c8f4;
  background: rgba(8, 82, 127, 0.9);
  color: #ffffff;
  box-shadow:
    0 0 13px rgba(37, 183, 236, 0.22),
    inset 0 0 14px rgba(45, 193, 242, 0.1);
}

.node-item:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.node-icon {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(58, 160, 208, 0.28);
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: rgba(4, 24, 49, 0.68);
  color: #6cd8ff;
}

.placement-tip {
  min-height: 34px;
  margin-top: 9px;
  padding: 0 7px;
  border: 1px solid rgba(52, 197, 244, 0.32);
  border-radius: 5px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(8, 61, 91, 0.42);
  color: #91dfff;
  font-size: 10px;
}

.placement-tip > span:nth-child(2) {
  flex: 1;
}

.placement-tip button {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  display: grid;
  place-items: center;
  background: transparent;
  color: #6fa7be;
  cursor: pointer;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #43dcff;
  box-shadow: 0 0 8px #43dcff;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}

@media (max-width: 720px) {
  .node-sidebar {
    top: 96px;
    bottom: auto;
    left: 8px;
    width: 180px;
    max-height: calc(100vh - 108px);
    padding: 8px;
    border: 1px solid rgba(36, 156, 209, 0.46);
    border-radius: 7px;
  }

  .node-sidebar.collapsed {
    width: 180px;
  }

  .node-sidebar::after {
    display: none;
  }

  .node-item {
    height: 62px;
  }
}
</style>
