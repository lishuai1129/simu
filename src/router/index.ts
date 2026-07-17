import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'sessions',
      component: () => import('@/views/sence/index.vue'),
    },
    {
      path: '/cesium',
      name: 'cesium',
      component: () => import('@/views/cesium/components/cesium.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
