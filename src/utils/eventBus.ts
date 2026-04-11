import mitt from 'mitt';

// 导入链路类型定义
import type { Link } from '../types/topo';

// 定义事件类型
export type Events = {
  switchViewMode: string;
  flyToHome: void;
  searchLocation: string;
  zoomIn: void;
  zoomOut: void;
  refreshScene: void;
  'sidebar:item-selected': { name: string, icon: string, type?: string };
  startSimulation: void;
  stopSimulation: void;
  startEmaneMonitor: { link: Link };
  setRenderPerformance: string;
  startPathDrawing: void;
  openDroneControlPanel: void;
  showAllSpecialEffects: void;
  effectsVisibilityChanged: boolean;
  toggleRenderingMode: void;
  renderingModeChanged: boolean;
  topoDataUpdated: void;
};

// 创建全局事件总线实例
const eventBus = mitt<Events>();

export default eventBus; 