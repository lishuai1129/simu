<template>
  <main class="cesium-page">
    <div ref="cesiumContainer" class="cesium-container"></div>
    <TopNav />
    <Sider
      :active-type="activePlacement?.nodeType"
      :disabled="!topoStore.currentSessionId"
      :link-selecting="linkSelectionActive"
      :link-selection-count="linkEndpointIds.length"
      @select="activatePlacement"
      @cancel="cancelPlacement"
      @configure-link="openLinkDialog"
    />

    <LinkConfigDialog
      v-model="linkDialogVisible"
      :link="selectedLink"
      :mode="linkDialogMode"
      :initial-node1-id="initialLinkNode1Id"
      :initial-node2-id="initialLinkNode2Id"
      @closed="handleLinkDialogClosed"
    />

    <NodeConfigDialog
      v-model="nodeDialogVisible"
      :node="selectedNode"
      :node-type="activePlacement?.nodeType || 'DEFAULT'"
      :mode="activePlacement?.mode || 'single'"
      :position="pendingPosition"
      @success="handleNodeSuccess"
      @closed="handleNodeDialogClosed"
    />

    <div v-if="loading" class="cesium-status" role="status">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span>地图加载中</span>
    </div>

    <div v-if="loadError" class="cesium-status cesium-error" role="alert">
      <el-icon :size="24"><WarningFilled /></el-icon>
      <span>{{ loadError }}</span>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import {
  Cartesian2,
  Cartographic,
  type Entity,
  ImageryLayer,
  Ion,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

import { useEntities } from '@/composables/useEntities'
import { useTopoStore } from '@/stores/topo'
import type { GeoPosition, NodePlacementRequest } from '@/views/cesium/types'

import LinkConfigDialog from './linkConfigDialog.vue'
import NodeConfigDialog from './NodeConfigDialog.vue'
import Sider from './sider.vue'
import TopNav from './topNav.vue'

defineOptions({ name: 'CesiumCanvas' })

const cesiumContainer = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadError = ref('')
const viewer = shallowRef<Viewer | null>(null)
const activePlacement = ref<NodePlacementRequest | null>(null)
const pendingPosition = ref<GeoPosition | null>(null)
const nodeDialogVisible = ref(false)
const selectedNodeId = ref<string | null>(null)
const linkDialogVisible = ref(false)
const linkDialogMode = ref<'single' | 'batch'>('single')
const selectedLinkId = ref<string | null>(null)
const linkSelectionActive = ref(false)
const linkEndpointIds = ref<string[]>([])
const initialLinkNode1Id = ref<string | null>(null)
const initialLinkNode2Id = ref<string | null>(null)
const topoStore = useTopoStore()
const { links, nodes } = storeToRefs(topoStore)
const selectedNode = computed(
  () => topoStore.nodes.find((node) => node.id === selectedNodeId.value) ?? null,
)
const selectedLink = computed(
  () => topoStore.links.find((link) => link.id === selectedLinkId.value) ?? null,
)
const { flyToAllNodes } = useEntities(viewer, nodes, links)
let placementHandler: ScreenSpaceEventHandler | null = null

interface MapClickMovement {
  position: Cartesian2
}

interface MapPickResult {
  id?: Entity
}

onMounted(async () => {
  const container = cesiumContainer.value
  const token = import.meta.env.VITE_CESIUM_ION_TOKEN

  if (!container) {
    loading.value = false
    loadError.value = '地图容器初始化失败'
    return
  }

  if (!token) {
    loading.value = false
    loadError.value = '未配置 Cesium Ion Token'
    return
  }

  try {
    Ion.defaultAccessToken = token

    const baseLayer = ImageryLayer.fromWorldImagery({})
    baseLayer.errorEvent.addEventListener((error) => {
      loadError.value = error.message || 'Cesium 影像加载失败'
    })

    const cesiumViewer = new Viewer(container, {
      baseLayer,
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
    })
    viewer.value = cesiumViewer
    setupPlacementHandler(cesiumViewer)

    loading.value = false

    try {
      await Promise.all([topoStore.fetchNodes(), topoStore.fetchLinks()])
      await nextTick()
      await flyToAllNodes()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '节点列表加载失败')
    }
  } catch (error) {
    loading.value = false
    loadError.value = error instanceof Error ? error.message : 'Cesium 初始化失败'
  }
})

function setupPlacementHandler(cesiumViewer: Viewer) {
  placementHandler = new ScreenSpaceEventHandler(cesiumViewer.scene.canvas)
  placementHandler.setInputAction((movement: MapClickMovement) => {
    if (nodeDialogVisible.value || linkDialogVisible.value) return

    const picked = cesiumViewer.scene.pick(movement.position) as MapPickResult | undefined
    const entityId = picked?.id?.id
    if (linkSelectionActive.value) {
      if (typeof entityId === 'string' && entityId.startsWith('node-')) {
        handleLinkNodeSelection(entityId.slice(5))
      } else {
        ElMessage.warning('请点击一个节点模型')
      }
      return
    }

    if (typeof entityId === 'string' && entityId.startsWith('link-')) {
      const linkId = entityId.slice(5)
      const link = topoStore.links.find((item) => item.id === linkId)
      if (link) {
        cancelPlacement()
        selectedNodeId.value = null
        selectedLinkId.value = link.id
        linkDialogMode.value = 'single'
        linkDialogVisible.value = true
        return
      }
    }

    if (typeof entityId === 'string' && entityId.startsWith('node-')) {
      const nodeId = entityId.slice(5)
      const node = topoStore.nodes.find((item) => item.id === nodeId)
      if (node) {
        cancelPlacement()
        selectedLinkId.value = null
        selectedNodeId.value = node.id
        nodeDialogVisible.value = true
        return
      }
    }

    if (!activePlacement.value) return

    const ray = cesiumViewer.camera.getPickRay(movement.position)
    if (!ray) return

    const cartesian = cesiumViewer.scene.globe.pick(ray, cesiumViewer.scene)
    if (!cartesian) {
      ElMessage.warning('未能获取该位置的地理坐标')
      return
    }

    const cartographic = Cartographic.fromCartesian(cartesian)
    pendingPosition.value = {
      lon: CesiumMath.toDegrees(cartographic.longitude),
      lat: CesiumMath.toDegrees(cartographic.latitude),
      alt: Math.max(0, cartographic.height),
    }
    selectedNodeId.value = null
    nodeDialogVisible.value = true
    cesiumViewer.scene.canvas.style.cursor = 'default'
  }, ScreenSpaceEventType.LEFT_CLICK)

  placementHandler.setInputAction(() => {
    if (linkSelectionActive.value) cancelLinkSelection(true)
  }, ScreenSpaceEventType.RIGHT_CLICK)
}

function activatePlacement(request: NodePlacementRequest) {
  if (!topoStore.currentSessionId) {
    ElMessage.warning('请先选择场景')
    return
  }

  cancelLinkSelection(false)
  activePlacement.value = request
  selectedLinkId.value = null
  selectedNodeId.value = null
  pendingPosition.value = null
  if (viewer.value) viewer.value.scene.canvas.style.cursor = 'crosshair'
}

function cancelPlacement() {
  activePlacement.value = null
  pendingPosition.value = null
  if (viewer.value && !viewer.value.isDestroyed()) viewer.value.scene.canvas.style.cursor = 'default'
}

function handleNodeSuccess() {
  cancelPlacement()
}

function handleNodeDialogClosed() {
  selectedNodeId.value = null
  cancelPlacement()
}

function openLinkDialog(mode: 'single' | 'batch') {
  if (!topoStore.currentSessionId) {
    ElMessage.warning('请先选择场景')
    return
  }
  if (topoStore.nodes.length < 2) {
    ElMessage.warning('至少需要两个节点才能创建链路')
    return
  }

  if (mode === 'single') {
    startLinkSelection()
    return
  }

  cancelLinkSelection(false)
  cancelPlacement()
  selectedNodeId.value = null
  selectedLinkId.value = null
  linkDialogMode.value = mode
  linkDialogVisible.value = true
}

function handleLinkDialogClosed() {
  selectedLinkId.value = null
  linkDialogMode.value = 'single'
  initialLinkNode1Id.value = null
  initialLinkNode2Id.value = null
}

function startLinkSelection() {
  cancelPlacement()
  selectedNodeId.value = null
  selectedLinkId.value = null
  initialLinkNode1Id.value = null
  initialLinkNode2Id.value = null
  linkEndpointIds.value = []
  linkSelectionActive.value = true
  if (viewer.value && !viewer.value.isDestroyed()) {
    viewer.value.scene.canvas.style.cursor = 'crosshair'
  }
  ElMessage.info('请左键选择第一个节点，右键可取消')
}

function handleLinkNodeSelection(nodeId: string) {
  const node = topoStore.nodes.find((item) => item.id === nodeId)
  if (!node) return

  if (!linkEndpointIds.value.length) {
    linkEndpointIds.value = [nodeId]
    ElMessage.success(`已选择节点 A：${node.name}，请继续选择节点 B`)
    return
  }

  if (linkEndpointIds.value[0] === nodeId) {
    ElMessage.warning('链路两端不能选择同一个节点')
    return
  }

  initialLinkNode1Id.value = linkEndpointIds.value[0] ?? null
  initialLinkNode2Id.value = nodeId
  linkEndpointIds.value = []
  linkSelectionActive.value = false
  linkDialogMode.value = 'single'
  linkDialogVisible.value = true
  if (viewer.value && !viewer.value.isDestroyed()) {
    viewer.value.scene.canvas.style.cursor = 'default'
  }
}

function cancelLinkSelection(showMessage: boolean) {
  if (!linkSelectionActive.value && !linkEndpointIds.value.length) return
  linkSelectionActive.value = false
  linkEndpointIds.value = []
  initialLinkNode1Id.value = null
  initialLinkNode2Id.value = null
  if (viewer.value && !viewer.value.isDestroyed()) {
    viewer.value.scene.canvas.style.cursor = 'default'
  }
  if (showMessage) ElMessage.info('已取消添加链路')
}

onBeforeUnmount(() => {
  placementHandler?.destroy()
  placementHandler = null
  if (viewer.value && !viewer.value.isDestroyed()) viewer.value.destroy()
  viewer.value = null
})
</script>

<style scoped>
.cesium-page,
.cesium-container {
  height: 100vh;
  overflow: hidden;
}

.cesium-page {
  width: 100%;
  position: relative;
  background: #090f14;
}

.cesium-container {
  width: calc(100% - 196px);
  margin-left: 196px;
}

.cesium-status {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(9, 15, 20, 0.82);
  color: #dbe7ee;
  font-size: 13px;
}

.cesium-error {
  color: #ffb4ab;
}

:deep(.cesium-viewer-bottom) {
  display: none;
}

:deep(.cesium-viewer-toolbar) {
  top: 94px;
  right: 12px;
}

:deep(.cesium-viewer canvas) {
  outline: none;
}

@media (max-width: 720px) {
  .cesium-container {
    width: 100%;
    margin-left: 0;
  }
}
</style>
