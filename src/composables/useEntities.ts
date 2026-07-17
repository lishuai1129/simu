import { onScopeDispose, watch, type Ref, type ShallowRef } from 'vue'
import {
  Cartesian2,
  Cartesian3,
  Color,
  Entity,
  HeightReference,
  LabelStyle,
  NearFarScalar,
  PolylineDashMaterialProperty,
  PolylineGlowMaterialProperty,
  VerticalOrigin,
  Viewer,
} from 'cesium'

import type { SimulationLink } from '@/api/link'
import type { NodeType, SimulationNode } from '@/api/node'

export const NODE_MODEL_MAP: Record<NodeType, string> = {
  DEFAULT: '/models/router.glb',
  SWITCH: '/models/router.glb',
  HUB: '/models/router.glb',
  WIRELESS_LAN: '/models/router.glb',
  DOCKER: '/models/router.glb',
  QEMU: '/models/router.glb',
}

const NODE_COLOR_MAP: Record<NodeType, string> = {
  DEFAULT: '#55c8ff',
  SWITCH: '#39e6a4',
  HUB: '#f8c35d',
  WIRELESS_LAN: '#bd8cff',
  DOCKER: '#58a6ff',
  QEMU: '#ff8b72',
}

function nodeFingerprint(node: SimulationNode) {
  return [node.name, node.nodeType, node.lon, node.lat, node.alt, NODE_MODEL_MAP[node.nodeType]].join('|')
}

function linkFingerprint(link: SimulationLink, node1: SimulationNode, node2: SimulationNode) {
  return [
    link.linkType,
    node1.lon,
    node1.lat,
    node1.alt,
    node2.lon,
    node2.lat,
    node2.alt,
  ].join('|')
}

export function useEntities(
  viewerRef: ShallowRef<Viewer | null>,
  nodes: Ref<SimulationNode[]>,
  links: Ref<SimulationLink[]>,
) {
  const nodeEntities = new Map<string, Entity>()
  const nodeFingerprints = new Map<string, string>()
  const linkEntities = new Map<string, Entity>()
  const linkFingerprints = new Map<string, string>()

  function createNodeEntity(viewer: Viewer, node: SimulationNode) {
    const accentColor = Color.fromCssColorString(NODE_COLOR_MAP[node.nodeType])
    const entity = viewer.entities.add({
      id: `node-${node.id}`,
      name: node.name,
      position: Cartesian3.fromDegrees(Number(node.lon), Number(node.lat), Math.max(0, Number(node.alt) || 0)),
      model: {
        uri: NODE_MODEL_MAP[node.nodeType],
        minimumPixelSize: 40,
        runAnimations: true,
        heightReference: HeightReference.RELATIVE_TO_GROUND,
        silhouetteColor: accentColor.withAlpha(0.8),
        silhouetteSize: 0.6,
      },
      label: {
        text: node.name,
        font: '600 14px Microsoft YaHei',
        fillColor: Color.WHITE,
        outlineColor: Color.fromCssColorString('#03111d'),
        outlineWidth: 4,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -42),
        showBackground: true,
        backgroundColor: Color.fromCssColorString('#03111d').withAlpha(0.78),
        backgroundPadding: new Cartesian2(7, 4),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new NearFarScalar(1.0e3, 1, 8.0e6, 0.72),
      },
      properties: {
        nodeId: node.id,
        nodeType: node.nodeType,
        serverId: node.serverId,
      },
    })

    nodeEntities.set(node.id, entity)
    nodeFingerprints.set(node.id, nodeFingerprint(node))
  }

  function removeNodeEntity(viewer: Viewer, nodeId: string) {
    const entity = nodeEntities.get(nodeId)
    if (entity) viewer.entities.remove(entity)
    nodeEntities.delete(nodeId)
    nodeFingerprints.delete(nodeId)
  }

  function syncNodeEntities(viewer: Viewer, nextNodes: SimulationNode[]) {
    if (viewer.isDestroyed()) return

    const nextIds = new Set(nextNodes.map((node) => node.id))
    for (const nodeId of nodeEntities.keys()) {
      if (!nextIds.has(nodeId)) removeNodeEntity(viewer, nodeId)
    }

    nextNodes.forEach((node) => {
      const fingerprint = nodeFingerprint(node)
      if (nodeFingerprints.get(node.id) === fingerprint) return
      if (nodeEntities.has(node.id)) removeNodeEntity(viewer, node.id)
      createNodeEntity(viewer, node)
    })
  }

  function createLinkEntity(
    viewer: Viewer,
    link: SimulationLink,
    node1: SimulationNode,
    node2: SimulationNode,
  ) {
    const isWireless = link.linkType === 'WIRELESS'
    const material = isWireless
      ? new PolylineDashMaterialProperty({
          color: Color.fromCssColorString('#f4c95d'),
          dashLength: 18,
        })
      : new PolylineGlowMaterialProperty({
          color: Color.fromCssColorString('#35d7ff'),
          glowPower: 0.18,
          taperPower: 0.7,
        })
    const entity = viewer.entities.add({
      id: `link-${link.id}`,
      name: `${node1.name} - ${node2.name}`,
      polyline: {
        positions: [
          Cartesian3.fromDegrees(node1.lon, node1.lat, Math.max(0, node1.alt)),
          Cartesian3.fromDegrees(node2.lon, node2.lat, Math.max(0, node2.alt)),
        ],
        width: isWireless ? 4 : 5,
        material,
        clampToGround: true,
      },
      properties: {
        linkId: link.id,
        linkType: link.linkType,
        node1Id: link.node1Id,
        node2Id: link.node2Id,
      },
    })

    linkEntities.set(link.id, entity)
    linkFingerprints.set(link.id, linkFingerprint(link, node1, node2))
  }

  function removeLinkEntity(viewer: Viewer, linkId: string) {
    const entity = linkEntities.get(linkId)
    if (entity) viewer.entities.remove(entity)
    linkEntities.delete(linkId)
    linkFingerprints.delete(linkId)
  }

  function syncLinkEntities(
    viewer: Viewer,
    nextLinks: SimulationLink[],
    nextNodes: SimulationNode[],
  ) {
    if (viewer.isDestroyed()) return

    const nodeMap = new Map(nextNodes.map((node) => [node.id, node]))
    const renderableLinks = nextLinks.filter(
      (link) => nodeMap.has(link.node1Id) && nodeMap.has(link.node2Id),
    )
    const nextIds = new Set(renderableLinks.map((link) => link.id))
    for (const linkId of linkEntities.keys()) {
      if (!nextIds.has(linkId)) removeLinkEntity(viewer, linkId)
    }

    renderableLinks.forEach((link) => {
      const node1 = nodeMap.get(link.node1Id)!
      const node2 = nodeMap.get(link.node2Id)!
      const fingerprint = linkFingerprint(link, node1, node2)
      if (linkFingerprints.get(link.id) === fingerprint) return
      if (linkEntities.has(link.id)) removeLinkEntity(viewer, link.id)
      createLinkEntity(viewer, link, node1, node2)
    })
  }

  function clearNodeEntities() {
    const viewer = viewerRef.value
    if (viewer && !viewer.isDestroyed()) {
      nodeEntities.forEach((entity) => viewer.entities.remove(entity))
      linkEntities.forEach((entity) => viewer.entities.remove(entity))
    }
    nodeEntities.clear()
    nodeFingerprints.clear()
    linkEntities.clear()
    linkFingerprints.clear()
  }

  function flyToNode(nodeId: string) {
    const viewer = viewerRef.value
    const entity = nodeEntities.get(nodeId)
    if (!viewer || viewer.isDestroyed() || !entity) return Promise.resolve(false)
    return viewer.flyTo(entity, { duration: 1.2 })
  }

  function flyToAllNodes() {
    const viewer = viewerRef.value
    const entities = [...nodeEntities.values()]
    if (!viewer || viewer.isDestroyed() || !entities.length) return Promise.resolve(false)
    return viewer.flyTo(entities, { duration: 1.5 })
  }

  watch(
    [viewerRef, nodes, links],
    ([viewer, nextNodes, nextLinks]) => {
      if (viewer) {
        syncNodeEntities(viewer, nextNodes)
        syncLinkEntities(viewer, nextLinks, nextNodes)
      }
    },
    { immediate: true },
  )

  onScopeDispose(clearNodeEntities)

  return {
    nodeEntities,
    linkEntities,
    syncNodeEntities,
    syncLinkEntities,
    clearNodeEntities,
    flyToNode,
    flyToAllNodes,
  }
}
