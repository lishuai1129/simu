import { ref } from 'vue'
import { defineStore } from 'pinia'

import {
  deleteServer,
  getServers,
  getServerStatus,
  registerServer,
  type CoreServer,
  type RegisterServerPayload,
  type ServerId,
} from '@/api/servers'

export const useServerStore = defineStore('servers', () => {
  const servers = ref<CoreServer[]>([])
  const onlineStatus = ref<Record<ServerId, boolean | null>>({})
  const checkingIds = ref(new Set<ServerId>())
  const loading = ref(false)

  async function fetchServers() {
    loading.value = true
    try {
      servers.value = await getServers()
      onlineStatus.value = Object.fromEntries(
        servers.value.map((server) => [server.id, onlineStatus.value[server.id] ?? null]),
      )
    } finally {
      loading.value = false
    }
  }

  async function addServer(payload: RegisterServerPayload) {
    const server = await registerServer(payload)
    servers.value = [server, ...servers.value]
    onlineStatus.value[server.id] = null
    return server
  }

  async function removeServer(id: ServerId) {
    await deleteServer(id)
    servers.value = servers.value.filter((server) => server.id !== id)
    delete onlineStatus.value[id]
  }

  async function checkServerStatus(id: ServerId) {
    checkingIds.value.add(id)
    try {
      const status = await getServerStatus(id)
      onlineStatus.value[id] = status.online
      return status.online
    } catch (error) {
      onlineStatus.value[id] = null
      throw error
    } finally {
      checkingIds.value.delete(id)
    }
  }

  async function checkAllServerStatus() {
    await Promise.allSettled(servers.value.map((server) => checkServerStatus(server.id)))
  }

  return {
    servers,
    onlineStatus,
    checkingIds,
    loading,
    fetchServers,
    addServer,
    removeServer,
    checkServerStatus,
    checkAllServerStatus,
  }
})
