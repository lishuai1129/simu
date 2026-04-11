import { defineStore } from 'pinia';
import type { FrameData, ConstellationInfo, InitLinks, SimulationLinks, LinkData } from '@/types/constellation';

export const useConstellationStore = defineStore('constellationStore', {
  state: () => ({
    // 仿真状态
    simulationRunning: false,
    currentTime: '',
    totalFrames: 0,
    currentFrame: -1,
    
    // 星座及卫星信息（每帧更新）
    constellationInfo: null as ConstellationInfo | null,
    
    // 当前存活的链路 (以 link_id 为键，[link_id, source_id, target_id] 为值)
    activeLinks: new Map<number, LinkData>(),
    
    // 数据最新更新时间戳
    lastUpdate: ''
  }),
  
  actions: {
    // 处理从 WebSocket 收到的每一帧数据
    processFrame(frame: FrameData) {
      this.currentTime = frame.simulation_current_time;
      this.totalFrames = frame.total_frames;
      this.currentFrame = frame.cur_frame;
      this.lastUpdate = frame.timestamp;
      
      // 更新星座与卫星姿态信息
      this.constellationInfo = frame.constellation;

      // 链路信息处理：分类为初始帧和仿真运行帧
      if (frame.type === 'init') {
        this.simulationRunning = true;
        this.activeLinks.clear(); // 新的初始化，清空之前的链路
        
        const links = frame.links as InitLinks;
        // 把同轨和跨轨链路加入 activeLinks
        const allInitLinks = [
          ...(links.same_orbit_links || []), 
          ...(links.cross_orbit_links || [])
        ];
        allInitLinks.forEach(link => {
          this.activeLinks.set(link[0], link);
        });

      } else if (frame.type === 'simulation') {
        const links = frame.links as SimulationLinks;

        // 1. 删除断开的链路
        if (links.cur_frame_deleted_links) {
          links.cur_frame_deleted_links.forEach(linkId => {
            this.activeLinks.delete(linkId);
          });
        }
        
        // 2. 添加新生成的链路（用户链路和馈电链路）
        const newLinks = [
          ...(links.cur_frame_add_user_links || []),
          ...(links.cur_frame_add_feeder_links || [])
        ];
        newLinks.forEach(link => {
          this.activeLinks.set(link[0], link); // link[0] 也就是 link_id
        });
      }
    },

    // 停止/重置仿真状态
    resetSimulation() {
      this.simulationRunning = false;
      this.currentTime = '';
      this.totalFrames = 0;
      this.currentFrame = -1;
      this.constellationInfo = null;
      this.activeLinks.clear();
      this.lastUpdate = '';
    }
  }
});
