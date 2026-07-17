import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { getLinks, type SimulationLink } from '@/api/link'
import { getNodes, type SimulationNode } from '@/api/node'
import type { Session, SessionState } from '@/api/sessions'

interface SelectedSession {
  id: string
  name: string
  state: SessionState
}

const STORAGE_KEY = 'simu20-current-session'

function readStoredSession(): SelectedSession | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const session = JSON.parse(stored) as Partial<SelectedSession>
    if (!session.id || !session.name || !session.state) return null

    return session as SelectedSession
  } catch {
    return null
  }
}

export const useTopoStore = defineStore('topo', () => {
  const currentSession = ref<SelectedSession | null>(readStoredSession())
  const currentSessionId = computed(() => currentSession.value?.id ?? null)
  const nodes = ref<SimulationNode[]>([])
  const nodesLoading = ref(false)
  const links = ref<SimulationLink[]>([])
  const linksLoading = ref(false)

  function selectSession(session: Session) {
    if (currentSession.value?.id !== session.id) {
      nodes.value = []
      links.value = []
    }
    currentSession.value = {
      id: session.id,
      name: session.name,
      state: session.state,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession.value))
  }

  function clearSession() {
    currentSession.value = null
    nodes.value = []
    links.value = []
    sessionStorage.removeItem(STORAGE_KEY)
  }

  function updateSessionState(state: SessionState) {
    if (!currentSession.value) return
    currentSession.value = { ...currentSession.value, state }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession.value))
  }

  async function fetchNodes() {
    const sessionId = currentSessionId.value
    if (!sessionId) {
      nodes.value = []
      return
    }

    nodesLoading.value = true
    try {
      nodes.value = await getNodes(sessionId)
    } finally {
      nodesLoading.value = false
    }
  }

  async function fetchLinks() {
    const sessionId = currentSessionId.value
    if (!sessionId) {
      links.value = []
      return
    }

    linksLoading.value = true
    try {
      links.value = await getLinks(sessionId)
    } finally {
      linksLoading.value = false
    }
  }

  function setNodes(nextNodes: SimulationNode[]) {
    nodes.value = nextNodes
  }

  function upsertNodes(nextNodes: SimulationNode[]) {
    const nodeMap = new Map(nodes.value.map((node) => [node.id, node]))
    nextNodes.forEach((node) => nodeMap.set(node.id, node))
    nodes.value = [...nodeMap.values()]
  }

  function setLinks(nextLinks: SimulationLink[]) {
    links.value = nextLinks
  }

  function upsertLinks(nextLinks: SimulationLink[]) {
    const linkMap = new Map(links.value.map((link) => [link.id, link]))
    nextLinks.forEach((link) => linkMap.set(link.id, link))
    links.value = [...linkMap.values()]
  }

  return {
    currentSession,
    currentSessionId,
    nodes,
    nodesLoading,
    links,
    linksLoading,
    selectSession,
    clearSession,
    updateSessionState,
    fetchNodes,
    fetchLinks,
    setNodes,
    upsertNodes,
    setLinks,
    upsertLinks,
  }
})
