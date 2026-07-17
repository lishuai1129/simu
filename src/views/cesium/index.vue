<script setup lang="ts">
defineOptions({ name: 'CesiumSceneView' })

import { ArrowLeft, Box, Layers3 } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import { useTopoStore } from '@/stores/topo'

const router = useRouter()
const topoStore = useTopoStore()
</script>

<template>
  <main class="cesium-page">
    <header class="cesium-header">
      <button class="back-button" type="button" title="返回场景列表" @click="router.push('/')">
        <ArrowLeft :size="18" aria-hidden="true" />
        返回
      </button>
      <div class="scene-title">
        <span class="scene-icon"><Layers3 :size="18" aria-hidden="true" /></span>
        <div>
          <strong>{{ topoStore.currentSession?.name || '未选择场景' }}</strong>
          <span>{{ topoStore.currentSession?.state || '-' }}</span>
        </div>
      </div>
      <span class="brand">CETC 20</span>
    </header>

    <section class="cesium-stage" aria-label="场景演示">
      <div class="stage-placeholder">
        <Box :size="42" stroke-width="1.4" aria-hidden="true" />
        <h1>{{ topoStore.currentSession?.name || '场景演示' }}</h1>
        <p>场景演示</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.cesium-page {
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: #101820;
  color: #eef4f7;
}

.cesium-header {
  height: 58px;
  padding: 0 20px;
  border-bottom: 1px solid #30404b;
  display: flex;
  align-items: center;
  gap: 20px;
  background: #17242d;
}

.back-button {
  height: 34px;
  padding: 0 11px;
  border: 1px solid #51626e;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: transparent;
  color: #dbe5ea;
  font: inherit;
  cursor: pointer;
}

.back-button:hover {
  background: #263640;
}

.scene-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.scene-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  background: #0e6ba8;
  color: #ffffff;
}

.scene-title > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.scene-title strong {
  overflow: hidden;
  font-size: 14px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-title span {
  color: #8da1ad;
  font-size: 10px;
}

.brand {
  margin-left: auto;
  color: #8da1ad;
  font-size: 12px;
  font-weight: 650;
}

.cesium-stage {
  height: calc(100vh - 58px);
  display: grid;
  place-items: center;
  background-color: #101820;
  background-image:
    linear-gradient(#263640 1px, transparent 1px),
    linear-gradient(90deg, #263640 1px, transparent 1px);
  background-size: 40px 40px;
}

.stage-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  color: #6f8795;
  text-align: center;
}

.stage-placeholder h1 {
  max-width: min(600px, 80vw);
  overflow: hidden;
  color: #dbe5ea;
  font-size: 20px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-placeholder p {
  font-size: 12px;
}
</style>
