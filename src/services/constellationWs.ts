import { useConstellationStore } from '@/store/modules/constellation';
import type { FrameData } from '@/types/constellation';

class ConstellationWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: number | null = null;
  private isConnected = false;

  constructor(url: string) {
    this.url = url;
  }

  // 1. 初始化并连接 WebSocket
  connect() {
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
   * 发送 "type": "start_simulation" 即可开始仿真
   */
  startSimulation() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('--- 发送开始仿真指令 ---');
      this.ws.send(JSON.stringify({ type: 'start_simulation' }));
    } else {
      console.error('[Constellation Ws] WebSocket 未准备就绪，无法发送指令');
    }
  }

  /**
   * 主动断开连接，并清理状态
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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


// 如果使用原有网关代理，也可以填 ws://localhost: 代理端口 /xxx
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
// WebSocket 服务地址：设置为具体的后端IP及端口映射路径
const constellationUrl = `ws://10.16.56.233:8765`;

export const constellationWs = new ConstellationWebSocketService(constellationUrl);
