import { useConstellationStore } from '@/store/modules/constellation';
import type { FrameData } from '@/types/constellation';

class ConstellationWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: number | null = null;
  private isConnected = false;

  // ------------------------------------
  // 模拟数据开关（开启后不连真WebSocket，而是本地定时器发假数据）
  // ------------------------------------
  public enableMock = true;
  private mockIntervalTimer: number | null = null;
  private currentMockFrame = 0;
  private maxMockFrames = 600;

  constructor(url: string) {
    this.url = url;
  }

  // 1. 初始化并连接 WebSocket
  connect() {
    // 拦截：如果是模拟模式
    if (this.enableMock) {
      console.log('[Constellation Mock] 启动模拟模式，视为连接成功');
      this.isConnected = true;
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[Constellation Ws] 连接成功');
      this.isConnected = true;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    /**
     * 2. 接收数据事件
     * 处理师弟发来的 init、simulation 等 json
     */
    this.ws.onmessage = (event) => {
      try {
        const data: FrameData = JSON.parse(event.data);
        const store = useConstellationStore();
        
        // 判断格式后交给 store 处理
        if (data && (data.type === 'init' || data.type === 'simulation')) {
          store.processFrame(data);
        } else {
          console.warn('[Constellation Ws] 收到了未识别的消息类型:', data);
        }
      } catch (e) {
        console.error('[Constellation Ws] 消息解析失败:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('[Constellation Ws] 连接已断开');
      this.isConnected = false;
      this.ws = null;
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[Constellation Ws] 发生错误:', error);
    };
  }

  // 断线重连机制
  private reconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[Constellation Ws] 尝试重新连接...');
      this.connect();
    }, 5000);
  }

  /**
   * 3. 向师弟服务端发送开始指令
   * 你提到：发送 "type": "start_simulation" 即可开始仿真
   */
  startSimulation() {
    // 拦截：如果是模拟模式，则立刻开始本地数据推送
    if (this.enableMock) {
      console.log('--- 启动前端本地假数据发帧 ---');
      this.currentMockFrame = 0;
      this.pushMockData(); // 发送第0帧(init)
      
      // 每0.5秒发一帧更新卫星位置，产生动画效果
      this.mockIntervalTimer = window.setInterval(() => {
        this.currentMockFrame++;
        if (this.currentMockFrame > this.maxMockFrames) {
          this.currentMockFrame = 0; // 循环
        }
        this.pushMockData();
      }, 500); 
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('--- 发送开始仿真指令 ---');
      this.ws.send(JSON.stringify({ type: 'start_simulation' }));
    } else {
      console.error('[Constellation Ws] WebSocket 未准备就绪，无法发送指令');
    }
  }

  /**
   * 4. 前端产生假数据的逻辑（仅模拟用）
   */
  private pushMockData() {
    const store = useConstellationStore();
    const isInit = this.currentMockFrame === 0;

    // 轨道半长轴近似地球半径+约600km
    const radius = 7000000; 
    
    // 计算台湾上空的初始中心经纬度（近似值），然后将其转化为 ECI 笛卡尔坐标的起始角度概念
    // 台湾：经度约 121度，即 121 * PI / 180
    //       纬度约 23.5度，即 23.5 * PI / 180
    const lon = 121.0 * Math.PI / 180;
    const lat = 23.5 * Math.PI / 180;

    // Helper: 将局部的球面位移(d_lon, d_lat) 映射到绝对笛卡尔坐标 
    const getCartesian = (dLon: number, dLat: number) => {
        const finalLon = lon + dLon;
        const finalLat = lat + dLat;
        // ECEF to Cartesian 简化公式 (假设球体，且不考虑地球自转引起的ECI偏差以简化效果)
        const x = radius * Math.cos(finalLat) * Math.cos(finalLon);
        const y = radius * Math.cos(finalLat) * Math.sin(finalLon);
        const z = radius * Math.sin(finalLat);
        return [x, y, z];
    };

    // 随帧数产生的小角度摆动量 (控制他们在台湾上空盘旋)
    const offset1 = (this.currentMockFrame * 0.05);
    const offset2 = (this.currentMockFrame * 0.05) + Math.PI; 
    const offset3 = (this.currentMockFrame * 0.05) + Math.PI / 2;
    const offset4 = (this.currentMockFrame * 0.05) - Math.PI / 2;

    // 控制活动半径大概在经纬度上的跨度 (这里设定摆幅大约0.05弧度，约跨越几百公里)
    const span = 0.05;

    const satellites = [
      {
        sat_id: 1, name: "Sat-1", sat_type: "LEO", constellation_id: 1, orbit_id: 1, inner_id: 1,
        position_ECI: getCartesian(span * Math.cos(offset1), span * Math.sin(offset1)),
        velocity_ECI: [0, 0, 0], orbit_a: 7000.0, orbit_e: 0.001, orbit_i: 90.0, orbit_R: 0, orbit_w: 0, orbit_M: 0
      },
      {
        sat_id: 2, name: "Sat-2", sat_type: "LEO", constellation_id: 1, orbit_id: 1, inner_id: 2,
        position_ECI: getCartesian(span * Math.cos(offset2), span * Math.sin(offset2)),
        velocity_ECI: [0, 0, 0], orbit_a: 7000.0, orbit_e: 0.001, orbit_i: 90.0, orbit_R: 0, orbit_w: 0, orbit_M: 0
      },
      {
        sat_id: 3, name: "Sat-3", sat_type: "LEO", constellation_id: 1, orbit_id: 2, inner_id: 1,
        position_ECI: getCartesian(span * Math.cos(offset3), span * Math.sin(offset3)),
        velocity_ECI: [0, 0, 0], orbit_a: 7000.0, orbit_e: 0.001, orbit_i: 0.0, orbit_R: 0, orbit_w: 0, orbit_M: 0
      },
      {
        sat_id: 4, name: "Sat-4", sat_type: "LEO", constellation_id: 1, orbit_id: 2, inner_id: 2,
        position_ECI: getCartesian(span * Math.cos(offset4), span * Math.sin(offset4)),
        velocity_ECI: [0, 0, 0], orbit_a: 7000.0, orbit_e: 0.001, orbit_i: 0.0, orbit_R: 0, orbit_w: 0, orbit_M: 0
      }
    ];

    const frameData: any = {
      type: isInit ? 'init' : 'simulation',
      simulation_current_time: new Date().toISOString(),
      total_frames: this.maxMockFrames,
      cur_frame: this.currentMockFrame,
      constellation: {
        constellation_id: 1,
        constellation_name: "Mock Constellation",
        orbit_number: 2,
        satellite_per_orbit: 2,
        same_orbit_link: 1,
        cross_orbit_link: 1,
        same_orbit_phase: 0,
        cross_orbit_phase: 0,
        satellites: satellites,
      },
      links: isInit ? {
        same_orbit_links: [[1, 1, 2], [2, 3, 4]], // 同轨
        cross_orbit_links: [[3, 1, 3], [4, 2, 4]] // 跨轨
      } : {
        cur_frame_deleted_links: [],
        cur_frame_add_user_links: [],
        cur_frame_add_feeder_links: []
      },
      timestamp: new Date().toISOString()
    };

    store.processFrame(frameData);
  }

  /**
   * 主动断开连接，并清理状态
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // 清除Mock Timer
    if (this.mockIntervalTimer) {
      clearInterval(this.mockIntervalTimer);
      this.mockIntervalTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    // 重置前端 store 状态
    const store = useConstellationStore();
    store.resetSimulation();
  }

  getConnectedStatus() {
    return this.isConnected;
  }
}

// 暴露出单例实例。您可以根据实际后端的 WS 端口地址修改该 URL。
// 如果使用原有网关代理，也可以填 ws://localhost: 代理端口 /xxx
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
// TODO: 你需要在这里指定对应的星座 WebSocket 服务地址 (这里默认举例 127.0.0.1:8888)
const constellationUrl = `${wsProtocol}//127.0.0.1:8888/constellation`;

export const constellationWs = new ConstellationWebSocketService(constellationUrl);
