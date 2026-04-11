<script setup lang="ts">
// 保留路由功能
</script>

<template>
  <div>
    <RouterView class="router-view-container" />
  </div>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: black;
}

/* 确保router-view内容不会有边框问题 */
.router-view-container {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
