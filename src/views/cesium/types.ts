import type { NodeType } from '@/api/node'

export type PlacementMode = 'single' | 'batch'

export interface NodePlacementRequest {
  nodeType: NodeType
  mode: PlacementMode
}

export interface GeoPosition {
  lon: number
  lat: number
  alt: number
}
