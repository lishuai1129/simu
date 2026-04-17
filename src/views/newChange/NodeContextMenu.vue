<template>
  <teleport to="body">
    <!-- 上下文菜单容器 -->
    <div v-if="visible && position" class="context-menu-container">
      <!-- 菜单和卡片包装容器 -->
      <div
        class="menu-and-card-wrapper"
        :style="{
          top: position.y + 'px',
          left: position.x + 'px'
        }"
        @mouseleave="() => { showBasicInfo = false; showProtocolInfo = false; showDataManage = false; }"
      >
        <!-- 上下文菜单 -->
        <div class="node-context-menu" @mousedown.stop>
          <div
            class="context-menu-item"
            @mouseenter="handleBasicInfoHover(true)"
            @mouseleave="handleBasicInfoHover(false)"
          >
            <span class="menu-icon">ℹ</span>
            <span class="menu-text">节点信息</span>
          </div>
          <div
            class="context-menu-item"
            @mouseenter="handleProtocolMenuHover(true)"
            @mouseleave="handleProtocolMenuHover(false)"
          >
            <span class="menu-icon">⚙</span>
            <span class="menu-text">节点操作</span>
          </div>
          <div
            class="context-menu-item"
            @mouseenter="handleDataManageHover(true)"
            @mouseleave="handleDataManageHover(false)"
          >
            <span class="menu-icon">📊</span>
            <span class="menu-text">数据管理</span>
          </div>
        </div>

        <!-- 基本信息悬浮卡片 -->
        <div
          v-if="showBasicInfo && fullNode"
          class="basic-info-card"
          @mouseleave="handleBasicInfoCardLeave"
        >
          <!-- 基本信息部分 -->
          <div class="info-section">
            <div class="section-title">基本信息</div>
            <div class="info-row">
              <div class="info-label">ID</div>
              <div class="info-value">{{ fullNode.id }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">名称</div>
              <div class="info-value">{{ fullNode.alias || fullNode.name }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">类型</div>
              <div class="info-value">{{ getNodeTypeLabel(fullNode.type) }}</div>
            </div>
            <!-- 下面添加了状态信息 -->
            <div class="info-row">
              <div class="info-label">状态</div>
              <div class="info-value">
                <span :class="['status-badge', 'status-' + (fullNode.status || 'up').toLowerCase()]">
                  {{ nodeStatusText }}
                </span>
              </div>
            </div>
          </div>

          <!-- 坐标信息部分 -->
          <div class="info-section" v-if="fullNode.geo">
            <div class="section-title">坐标信息</div>
            <div class="location-row">
              <span>经度: {{ fullNode.geo.lon }}, 纬度: {{ fullNode.geo.lat }}, 高度: {{ fullNode.geo.alt }}米</span>
            </div>
          </div>

          <!-- 虚拟机模板信息部分 -->
          <div class="info-section" v-if="isVMNode && vmTemplateInfo">
            <div class="section-title">模板信息</div>
            <div class="vm-template-grid">
              <div class="vm-template-item">
                <div class="item-label">模板名称</div>
                <div class="item-value">{{ vmTemplateInfo.name }}</div>
              </div>
              <div class="vm-template-item">
                <div class="item-label">模板描述</div>
                <div class="item-value">{{ vmTemplateInfo.description }}</div>
              </div>
              <div class="vm-template-item">
                <div class="item-label">CPU核数</div>
                <div class="item-value">{{ vmTemplateInfo.vcpu }}核</div>
              </div>
              <div class="vm-template-item">
                <div class="item-label">内存大小</div>
                <div class="item-value">{{ formatMemory(vmTemplateInfo.memory) }}</div>
              </div>
              <div class="vm-template-item">
                <div class="item-label">当前内存</div>
                <div class="item-value">{{ formatMemory(vmTemplateInfo.curMemory) }}</div>
              </div>
              <div class="vm-template-item">
                <div class="item-label">磁盘文件</div>
                <div class="item-value">{{ vmTemplateInfo.disk }}</div>
              </div>
              <div class="vm-template-item full-width">
                <div class="item-label">镜像位置</div>
                <div class="item-value">{{ vmTemplateInfo.location }}</div>
              </div>
            </div>
          </div>

          <!-- 协议信息部分 -->
          <div class="info-section" v-if="canShowProtocol">
            <div class="section-title">协议信息</div>
            <div v-if="fullNode?.config_services && fullNode.config_services.length > 0" class="protocol-list">
              <div v-for="protocol in fullNode.config_services" :key="protocol" class="protocol-item">
                <span class="protocol-badge">{{ getProtocolLabel(protocol) }}</span>
              </div>
            </div>
            <div v-else class="no-protocol">
              <div class="no-protocol-text">未配置协议</div>
            </div>
          </div>
        </div>

        <!-- 节点操作悬浮卡片 -->
        <div
          v-if="showProtocolInfo && fullNode"
          class="operation-card"
          @mouseleave="handleProtocolInfoCardLeave"
        >
          <!-- 故障设置部分 -->
          <div class="operation-section">
            <div class="section-title">
              <svg width="16" height="16" style="margin-right: 4px; vertical-align: middle;">
                <circle cx="8" cy="8" r="7" fill="#ff5252" fill-opacity="0.18" />
                <circle cx="8" cy="8" r="4" fill="#ff5252" fill-opacity="0.38" />
              </svg>故障设置
            </div>
            <div class="fault-config">
              <div class="fault-item">
                <div class="fault-label">故障状态</div>
                <el-switch
                  v-model="faultConfig.enabled"
                  active-color="#ff4949"
                  inactive-color="#13ce66"
                  :active-text="faultConfig.enabled ? '已开启' : '已关闭'"
                  @change="handleFaultToggle"
                />
              </div>
            </div>
          </div>

          <!-- 操作按钮部分 -->
          <div class="operation-section operation-buttons-section">
            <div class="section-title">
              <svg width="16" height="16" style="margin-right: 4px; vertical-align: middle;">
                <path d="M2 8a6 6 0 1 0 12 0A6 6 0 0 0 2 8z" fill="#00d4ff" fill-opacity="0.18" />
                <circle cx="8" cy="8" r="2" fill="#00d4ff" fill-opacity="0.38" />
              </svg>操作功能
            </div>
            <div class="operation-buttons-group">
              <!-- 信号级仿真（无线设备） -->
              <button 
                v-if="isWirelessDevice"
                class="operation-btn signal-btn"
                @click="handleOpenSignalSimDialog"
                title="信号级仿真"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                信号级仿真
              </button>

              <!-- 打开终端 -->
              <button 
                v-if="canOpenTerminal"
                class="operation-btn terminal-btn"
                @click="handleOpenTerminal"
                title="打开终端"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="4 17 10 11 4 5"></polyline>
                  <line x1="12" y1="19" x2="20" y2="19"></line>
                </svg>
                打开终端
              </button>

              <!-- 虚拟机操作 -->
              <button 
                v-if="isVMNode"
                class="operation-btn vm-start-btn"
                @click="handleStartVM"
                title="启动虚拟机"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                </svg>
                启动虚拟机
              </button>

              <!-- 虚拟机关闭按钮 -->
              <button 
                v-if="isVMNode"
                class="operation-btn vm-stop-btn"
                @click="handleStopVM"
                title="关闭虚拟机"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1"></circle>
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                </svg>
                关闭虚拟机
              </button>

              <!-- 虚拟机参数编辑 -->
              <button 
                v-if="isVMNode"
                class="operation-btn vm-edit-btn"
                @click="handleEditVMParams"
                title="编辑参数"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                编辑参数
              </button>

              <!-- 协议配置（仅路由器） -->
              <button 
                v-if="isRouter"
                class="operation-btn protocol-btn"
                @click="handleOpenProtocolConfig"
                title="协议配置"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1"></circle>
                  <path d="M12 1v6m0 6v4M4.22 4.22l4.24 4.24m5.08 0l4.24-4.24M1 12h6m6 0h4M4.22 19.78l4.24-4.24m5.08 0l4.24 4.24"></path>
                </svg>
                协议配置
              </button>

              <!-- 静态路由配置（仅非无线设备） -->
              <button 
                v-if="!isWirelessDevice"
                class="operation-btn static-route-btn"
                @click="handleOpenStaticRouteConfig"
                title="静态路由配置"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"></path>
                  <path d="M8 8l-3-3-3 3M16 16l3 3 3-3"></path>
                </svg>
                静态路由
              </button>

              <!-- 删除节点 -->
              <button 
                class="operation-btn delete-btn"
                @click="handleDelete"
                title="删除节点"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                删除节点
              </button>
            </div>
          </div>
        </div>

        <!-- 数据管理悬浮卡片 -->
        <div
          v-if="showDataManage && fullNode"
          class="data-manage-card"
          @mouseleave="handleDataManageCardLeave"
        >
          <div class="data-manage-section">
            <div class="section-title">数据管理</div>
            <div class="data-manage-placeholder">
              <div class="placeholder-text">数据管理功能开发中...</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 半透明背景，用于关闭菜单 -->
    <div
      v-if="visible"
      class="context-menu-backdrop"
      @click="handleClose"
      @contextmenu.prevent="handleClose"
    ></div>

    <!-- VM参数编辑对话框 -->
    <VMEditDialog
      v-model:visible="showVMEditDialog"
      :nodeId="fullNode?.id || 0"
      :sessionId="topoStore.currentSessionId ?? topoStore.topoData?.id"
      :templateId="vmTemplateInfo?.id || 1"
      :templateName="vmTemplateInfo?.name || 'Unknown'"
      :initialData="vmEditData"
      @confirm="handleVMEditConfirm"
    />
    <!-- 协议配置对话框 -->
    <protocolConfigDialog
      v-if="showProtocolConfigDialog"
      :visible="showProtocolConfigDialog"
      :protocol="''"
      :interfaces="nodeInterfaces"
      :nodeName="fullNode?.alias || fullNode?.name || ''"
      :nodeType="fullNode?.type"
      :nodeImage="fullNode?.image"
      @close="showProtocolConfigDialog = false"
      @save="handleProtocolSave"
    />
    <!-- 静态路由配置对话框（复用protocolConfigDialog，非无线设备） -->
    <protocolConfigDialog
      v-if="showStaticRouteDialog"
      :visible="showStaticRouteDialog"
      :protocol="''"
      :interfaces="nodeInterfaces"
      :nodeName="fullNode?.alias || fullNode?.name || ''"
      :nodeType="fullNode?.type || 'OTHER'"
      :nodeImage="''"
      @close="showStaticRouteDialog = false"
      @save="handleStaticRouteSave"
    />
  </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTopoStore } from '../../../store/modules/topo';
import { useVMTemplateStore } from '../../../store/modules/vmTemplate';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { Node } from '../../../types/topo';
import { startVMNode, stopVMNode } from '../../../api/node';
import { getUserInfo } from '../../../store/user';
import VMEditDialog from './VMEditDialog.vue';
import protocolConfigDialog from './protocolConfigDialog.vue';

// 节点上下文菜单组件属性定义
interface NodeContextMenuProps {
  visible: boolean;
  node: any;
  position: { x: number; y: number } | null;
}

// 定义属性
const props = withDefaults(defineProps<NodeContextMenuProps>(), {
  visible: false,// 是否显示上下文菜单
  node: null,// 当前操作的节点
  position: null// 菜单显示位置
});

// 定义事件 让父组件监听事件 修改节点状态
const emit = defineEmits<{
  close: [];// 关闭上下文菜单
  selectMenu: [menu: string];// 选择菜单项
  openTerminal: [node: Node | null];// 打开终端
  openSignalSim: [node: Node | null];// 打开信号级仿真对话框
  openVnc: [data: {nodeId: any; nodeName: string; wsUrl: string}];// 打开VNC连接
}>();

const topoStore = useTopoStore(); // 引入topoStore获取各个设备状态
const vmTemplateStore = useVMTemplateStore();
const currentView = ref<'menu' | 'protocolInfo' | 'dataManage'>('menu');
const showBasicInfo = ref(false); // 是否显示基本信息卡片
const showProtocolInfo = ref(false); // 是否显示协议信息卡片
const showDataManage = ref(false); // 是否显示数据管理卡片
const showVMEditDialog = ref(false); // 是否显示虚拟机参数编辑对话框
const showProtocolConfigDialog = ref(false); // 是否显示协议配置对话框
const showStaticRouteDialog = ref(false); // 是否显示静态路由配置对话框
const nodeInterfaces = ref<string[]>([]); // 节点接口列表

const vmEditData = ref<any>({
  cpu: 1,
  memory: '1048576',
  currentMemory: '1048576',
  templateId: 1
});

// 故障配置状态
const faultConfig = ref({
  enabled: false
});

// 记录当前显示的节点ID，用于检测节点切换
const currentNodeId = ref<number | null>(null);

// 本地节点副本，用于实时显示状态变化
const localNodeData = ref<Node | null>(null);

// 直接使用传入的node，它已经是topoStore中查找到的完整节点数据
const fullNode = computed((): Node | null => {
  return localNodeData.value || props.node || null;
});

// 监听props.node变化，同步本地节点副本
watch(() => props.node, (newNode) => {
  if (newNode) {
    localNodeData.value = { ...newNode };
  }
}, { immediate: true });

// 监听showProtocolInfo变化，仅在节点切换时才初始化故障状态
watch(showProtocolInfo, (newVal) => {
  if (newVal && fullNode.value) {
    // 检测节点是否改变
    if (fullNode.value.id !== currentNodeId.value) {
      // 节点切换了，初始化故障配置
      currentNodeId.value = fullNode.value.id;
      faultConfig.value.enabled = fullNode.value.status === 'DOWN';
    }
  }
});

// 判断是否为无线设备
const isWirelessDevice = computed(() => {
  if (!props.node) return false;
  
  const nodeType = getNodeTypeLabel(props.node.type || '');
  
  return nodeType === '无人机' ||
         nodeType === '机动车' ||
         nodeType === '卫星' ||
         nodeType === '基站';
});

// 判断是否为路由器
const isRouter = computed(() => {
  if (!props.node) return false;
  
  const nodeType = getNodeTypeLabel(props.node.type || '');
  
  return nodeType === '路由器';
});

// 判断是否为虚拟机
const isVMNode = computed(() => {
  if (!props.node) return false;
  
  const nodeType = getNodeTypeLabel(props.node.type || '');
  
  return nodeType === '虚拟机';
});

// 判断是否可以打开终端
const canOpenTerminal = computed(() => {
  return fullNode.value !== null; // 所有设备都可以打开终端
});

// 判断是否可以显示协议配置
const canShowProtocol = computed(() => {
  return isWirelessDevice.value || isRouter.value;
});

// 获取虚拟机模板信息
const vmTemplateInfo = computed(() => {
  if (!isVMNode.value || !fullNode.value) return null;
  
  const node = fullNode.value;
  
  // 如果有templateId，查找对应的模板
  if (node.templateId && vmTemplateStore.templates.length > 0) {
    const template = vmTemplateStore.getTemplateById(node.templateId);
    if (template) return template;
  }
  
  // 否则返回第一个模板
  if (vmTemplateStore.templates.length > 0) {
    return vmTemplateStore.templates[0];
  }
  
  return null;
});

const handleSelectMenu = (menu: string) => {
  if (menu === 'protocolInfo') {
    currentView.value = 'protocolInfo';
  } else if (menu === 'dataManage') {
    currentView.value = 'dataManage';
  }
  emit('selectMenu', menu);
};

const handleBasicInfoHover = (isHovering: boolean) => {
  if (isHovering) {
    showBasicInfo.value = true;
    showProtocolInfo.value = false;
    showDataManage.value = false;
  }
};

const handleBasicInfoCardLeave = () => {
  showBasicInfo.value = false;
};

const handleProtocolMenuHover = (isHovering: boolean) => {
  if (isHovering) {
    showProtocolInfo.value = true;
    showBasicInfo.value = false;
    showDataManage.value = false;
  }
};

const handleProtocolInfoCardLeave = () => {
  showProtocolInfo.value = false;
};

const handleDataManageHover = (isHovering: boolean) => {
  if (isHovering) {
    showDataManage.value = true;
    showBasicInfo.value = false;
    showProtocolInfo.value = false;
  }
};

const handleDataManageCardLeave = () => {
  showDataManage.value = false;
};

const handleClose = () => {
  currentView.value = 'menu';
  showBasicInfo.value = false;
  emit('close');
};

// 监听 visible 变化，重置视图
watch(() => props.visible, (newVal) => {
  if (newVal) {
    currentView.value = 'menu';
    showBasicInfo.value = false;
  }
});

// 监听节点状态变化，同步故障配置
watch(() => fullNode.value?.status, (newStatus) => {
  faultConfig.value.enabled = newStatus === 'DOWN';
}, { immediate: true });
// 节点类型中英文映射（完全复用NodeInfoPanel的逻辑）
const getNodeTypeLabel = (type: string): string => {
  // 根据节点名称前缀来确定类型，不再依赖type字段
  const nodeName = fullNode.value?.name || '';

  // 优先检查更具体的前缀，避免被通用前缀误判
  if (nodeName.includes('BUSINESS_Transmitter') || nodeName.startsWith('业务终端')) {
    return '业务终端';
  }
  if (nodeName.includes('ATTACK_MACHINE') || nodeName.startsWith('攻击机')) {
    return '攻击机';
  }
  if (nodeName.includes('SECURITY_MACHINE') || nodeName.startsWith('安全机')) {
    return '安全机';
  }
  if (nodeName.includes('SDN_CONTROLLER') || nodeName.startsWith('SDN控制器')) {
    return 'SDN控制器';
  }
  if (nodeName.includes('Ovs_SWITCH') || nodeName.startsWith('Ovs交换机')) {
    return 'Ovs交换机';
  }
  if (nodeName.includes('P4') || nodeName.startsWith('P4交换机')) {
    return 'P4交换机';
  }
  if (nodeName.includes('SR') || nodeName.startsWith('SR交换机')) {
    return 'SR交换机';
  }
  if (nodeName.includes('RTSP_RTP') || nodeName.startsWith('视频服务器')) {
    return '视频服务器';
  }
  if (nodeName.includes('VoIP_SIP') || nodeName.startsWith('VoIP')) {
    return 'VoIP服务器';
  }
  if (nodeName.includes('HTTP') || nodeName.startsWith('HTTP')) {
    return 'HTTP服务器';
  }
  if (nodeName.includes('FTP') || nodeName.startsWith('FTP')) {
    return 'FTP服务器';
  }
  if (nodeName.includes('DNS') || nodeName.startsWith('DNS')) {
    return 'DNS服务器';
  }
  if (nodeName.includes('SMTP') || nodeName.startsWith('SMTP')) {
    return 'SMTP服务器';
  }
  if (nodeName.includes('TMV') || nodeName.startsWith('流量终端')) {
    return 'TMV节点';
  }
  if (nodeName.startsWith('VAN') || nodeName.startsWith('机动车')) {
    return '机动车';
  }
  if (nodeName.startsWith('SATELLITE') || nodeName.startsWith('卫星')) {
    return '卫星';
  }
  if (nodeName.startsWith('DRONE') || nodeName.startsWith('无人机')) {
    return '无人机';
  }
  if (nodeName.startsWith('BASESTATION') || nodeName.startsWith('基站')) {
    return '基站';
  }
  if (nodeName.startsWith('subnet-') || nodeName.startsWith('子网')) {
    return '子网';
  }
  if (nodeName.startsWith('干扰')) {
    return '干扰节点';
  }
  if (nodeName.startsWith('SERVER') || nodeName.startsWith('服务器')) {
    return '服务器';
  }
  if (nodeName.startsWith('ROUTER') || nodeName.startsWith('路由器')) {
    return '路由器';
  }
  if (nodeName.startsWith('SWITCH') || nodeName.startsWith('交换机')) {
    return '交换机';
  }
  if (nodeName.startsWith('VMNODE') || nodeName.startsWith('虚拟机')) {
    return '虚拟机';
  }
  if (nodeName.startsWith('ens52f0') || nodeName.startsWith('半实物')) {
    return '半实物节点';
  }
  if (nodeName.startsWith('DEVICE') || nodeName.startsWith('设备')) {
    return '设备';
  }

  return '设备';
};

// 节点状态文本
const nodeStatusText = computed(() => {
  const status = fullNode.value?.status || 'UP';
  return status === 'UP' ? '正常' : '故障';
});

// 节点状态样式类
const nodeStatusClass = computed(() => {
  const status = fullNode.value?.status || 'UP';
  return status === 'UP' ? 'status-up' : 'status-down';
});

// 根据节点类型获取基本信息字段（完全复用NodeInfoPanel的展示方式）
const getBasicInfoFields = (node: Node | null): Array<{label: string; key: string; value: any}> => {
  if (!node) return [];
  
  const fields: Array<{label: string; key: string; value: any}> = [
    { label: '节点名称', key: 'name', value: node.alias || node.name },
    { label: '节点类型', key: 'type', value: getNodeTypeLabel(node.type) }
  ];
  
  return fields;
};

// 处理故障状态切换
const handleFaultToggle = async (value: boolean) => {
  try {
    const convertRoleToNumber = (role: any): number => {
      if (typeof role === 'number') {
        return role;
      }
      if (typeof role === 'string') {
        const roleMap: Record<string, number> = {
          'WHITE': 1,
          'RED': 2,
          'BLUE': 3
        };
        return roleMap[role.toUpperCase()] || 1;
      }
      return 1;
    };

    const updatedNodeData = {
      ...fullNode.value,
      status: value ? 'DOWN' : 'UP',
      role: convertRoleToNumber(fullNode.value?.role)
    };

    // 立即更新本地节点副本的状态以显示UI变化
    if (localNodeData.value) {
      localNodeData.value.status = value ? 'DOWN' : 'UP';
    }
    faultConfig.value.enabled = value;

    await (topoStore as any).editNodeRemote(updatedNodeData);

    ElMessage({
      message: value ? '节点故障已开启，状态已设为DOWN' : '节点故障已关闭，状态已设为UP',
      type: value ? 'warning' : 'success',
      duration: 2000
    });
  } catch (error: any) {
    console.error('更新节点状态失败:', error);
    ElMessage({
      message: error?.message || '更新节点状态失败',
      type: 'error',
      duration: 3000
    });

    // 失败时恢复之前的状态
    if (localNodeData.value) {
      localNodeData.value.status = value ? 'UP' : 'DOWN';
    }
    faultConfig.value.enabled = !value;
  }
};

// 删除节点
const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除节点"${fullNode.value?.alias || fullNode.value?.name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        center: true,
        customClass: 'delete-confirm-box',
      }
    );
    await (topoStore as any).removeNodeRemote(fullNode.value?.id);
    ElMessage.success('节点已删除');
    handleClose();
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '删除失败');
    }
  }
};

// 打开终端
const handleOpenTerminal = () => {
  emit('openTerminal', fullNode.value);
  handleClose();
};

// 打开信号级仿真对话框
const handleOpenSignalSimDialog = () => {
  emit('openSignalSim', fullNode.value);
  handleClose();
};

// 启动虚拟机
const handleStartVM = async () => {
  try {
    const sessionId = topoStore.currentSessionId ?? topoStore.topoData?.id;
    if (!sessionId) {
      ElMessage.error("会话信息不完整，无法启动虚拟机");
      return;
    }

    const userInfo = getUserInfo();
    const userId = userInfo?.id;
    if (!userId) {
      ElMessage.error("用户信息不完整，请重新登录");
      return;
    }

    const nodeId = fullNode.value?.id;
    if (!nodeId) {
      ElMessage.error("节点信息不完整");
      return;
    }

    const response = await startVMNode(sessionId, nodeId, userId) as any;

    if (response && response.code === 200 && response.data) {
      ElMessage.success('虚拟机启动成功');
      const nodeName = fullNode.value?.alias || fullNode.value?.name || '虚拟机';
      emit('openVnc', {
        nodeId: nodeId,
        nodeName: nodeName,
        wsUrl: response.data
      });
    } else {
      ElMessage.error(response?.msg || '启动虚拟机失败');
    }
  } catch (error: any) {
    console.error('启动虚拟机失败:', error);
    ElMessage.error(error?.message || '启动虚拟机失败，请重试');
  }
};

// 关闭虚拟机
const handleStopVM = async () => {
  try {
    const sessionId = topoStore.currentSessionId ?? topoStore.topoData?.id;
    if (!sessionId) {
      ElMessage.error("会话信息不完整，无法关闭虚拟机");
      return;
    }

    const userInfo = getUserInfo();
    const userId = userInfo?.id;
    if (!userId) {
      ElMessage.error("用户信息不完整，请重新登录");
      return;
    }

    const nodeId = fullNode.value?.id;
    if (!nodeId) {
      ElMessage.error("节点信息不完整");
      return;
    }

    const response = await stopVMNode(sessionId, nodeId, userId) as any;

    if (response && response.code === 200) {
      ElMessage.success('虚拟机已关闭');
    } else {
      ElMessage.error(response?.msg || '关闭虚拟机失败');
    }
  } catch (error: any) {
    console.error('关闭虚拟机失败:', error);
    ElMessage.error(error?.message || '关闭虚拟机失败，请重试');
  }
};

// 编辑虚拟机参数
const handleEditVMParams = () => {
  if (!vmTemplateInfo.value) {
    ElMessage.error('无法获取VM模板信息');
    return;
  }

  // 初始化编辑数据
  vmEditData.value = {
    cpu: vmTemplateInfo.value.vcpu || 1,
    memory: vmTemplateInfo.value.memory || '1048576',
    currentMemory: vmTemplateInfo.value.curMemory || vmTemplateInfo.value.memory || '1048576',
    templateId: vmTemplateInfo.value.id || 1
  };

  showVMEditDialog.value = true;
};

// 处理VM编辑确认
const handleVMEditConfirm = (data: any) => {
  // VM参数更新
  ElMessage.success('虚拟机参数已更新');
};

// 打开协议配置对话框
const handleOpenProtocolConfig = () => {
  // 获取节点的所有网卡接口
  nodeInterfaces.value = [];
  if (!fullNode.value?.id) return;

  // 获取节点的所有链路
  const nodeLinks = (topoStore.topoData?.links || []).filter(
    (link: any) => link.node1_id === fullNode.value?.id || link.node2_id === fullNode.value?.id
  );

  // 从链路中提取接口信息
  nodeLinks.forEach((link: any) => {
    if (link.node1_id === fullNode.value?.id && link.iface1) {
      if (link.iface1.name && !nodeInterfaces.value.includes(link.iface1.name)) {
        nodeInterfaces.value.push(link.iface1.name);
      }
    } else if (link.node2_id === fullNode.value?.id && link.iface2) {
      if (link.iface2.name && !nodeInterfaces.value.includes(link.iface2.name)) {
        nodeInterfaces.value.push(link.iface2.name);
      }
    }
  });

  showProtocolConfigDialog.value = true;
};

// 处理协议配置保存
const handleProtocolSave = ({ config }: { config: any }) => {
  // 协议配置保存逻辑
  ElMessage.success('协议配置已保存');
  showProtocolConfigDialog.value = false;
};

// 打开静态路由配置对话框
const handleOpenStaticRouteConfig = () => {
  // 获取节点的所有网卡接口
  nodeInterfaces.value = [];
  if (!fullNode.value?.id) return;

  // 获取节点的所有链路
  const nodeLinks = (topoStore.topoData?.links || []).filter(
    (link: any) => link.node1_id === fullNode.value?.id || link.node2_id === fullNode.value?.id
  );

  // 从链路中提取接口信息
  nodeLinks.forEach((link: any) => {
    if (link.node1_id === fullNode.value?.id && link.iface1) {
      if (link.iface1.name && !nodeInterfaces.value.includes(link.iface1.name)) {
        nodeInterfaces.value.push(link.iface1.name);
      }
    } else if (link.node2_id === fullNode.value?.id && link.iface2) {
      if (link.iface2.name && !nodeInterfaces.value.includes(link.iface2.name)) {
        nodeInterfaces.value.push(link.iface2.name);
      }
    }
  });

  showStaticRouteDialog.value = true;
};

// 处理静态路由配置保存
const handleStaticRouteSave = ({ config }: { config: any }) => {
  // 静态路由配置保存逻辑
  ElMessage.success('静态路由配置已保存');
  showStaticRouteDialog.value = false;
};

// 格式化内存
const formatMemory = (memory: string): string => {
  const memoryKB = parseInt(memory);
  if (memoryKB >= 1024 * 1024) {
    return `${(memoryKB / (1024 * 1024)).toFixed(1)} GB`;
  } else if (memoryKB >= 1024) {
    return `${(memoryKB / 1024).toFixed(1)} MB`;
  } else {
    return `${memoryKB} KB`;
  }
};

// 获取协议标签
const getProtocolLabel = (protocol: string): string => {
  const protocolMap: Record<string, string> = {
    'zebra': 'Zebra协议',
    'OSPFv2': 'OSPF协议',
    'olsrd': 'OLSR协议',
    'BGP': 'BGP协议',
    'RIP': 'RIP协议'
  };
  return protocolMap[protocol] || protocol;
};
</script>

<style scoped>
.context-menu-container {
  position: fixed;
  z-index: 2000;
}

.menu-and-card-wrapper {
  position: fixed;
  display: flex;
  gap: 0;
  align-items: flex-start;
  z-index: 2000;
}

.node-context-menu {
  position: relative;
  z-index: 2000;
  background: linear-gradient(135deg, #0f1929 0%, #1a2847 100%);
  border: 1px solid rgba(0, 234, 255, 0.3);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 234, 255, 0.2);
  min-width: 160px;
  animation: contextMenuAppear 0.15s ease-out;
  backdrop-filter: blur(8px);
}

@keyframes contextMenuAppear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  padding: 12px 16px;
  color: #00eaff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 234, 255, 0.1);
  font-size: 14px;
  user-select: none;
}

.context-menu-item:last-child {
  border-bottom: none;
}

.context-menu-item:hover {
  background: rgba(0, 234, 255, 0.1);
  color: #fff;
  padding-left: 20px;
}

.menu-icon {
  font-size: 16px;
  min-width: 20px;
}

.menu-text {
  flex: 1;
}

/* 基本信息悬浮卡片 */
.basic-info-card {
  position: relative;
  z-index: 2001;
  background: linear-gradient(135deg, #0f1929 0%, #1a2847 100%);
  border: 1.5px solid rgba(0, 234, 255, 0.4);
  border-left: none;
  border-radius: 0 12px 12px 0;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.7),
    0 0 20px rgba(0, 234, 255, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  width: 340px;
  padding: 18px;
  animation: cardAppear 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
  backdrop-filter: blur(10px);
}

@keyframes cardAppear {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.info-section {
  margin-bottom: 16px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.section-title {
  color: #00eaff;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 10px;
  letter-spacing: 0.8px;
  padding-left: 8px;
  border-left: 3px solid rgba(0, 234, 255, 0.8);
  text-transform: uppercase;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(0, 234, 255, 0.06);
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid rgba(0, 234, 255, 0.2);
  transition: all 0.2s ease;
}

.info-row:hover {
  background: rgba(0, 234, 255, 0.1);
  border-color: rgba(0, 234, 255, 0.35);
}

.info-row:last-child {
  margin-bottom: 0;
}

.location-row {
  padding: 10px 12px;
  background: rgba(0, 234, 255, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(0, 234, 255, 0.2);
  color: #eaf6ff;
  font-size: 13px;
  line-height: 1.5;
}

.info-label {
  color: #4ecfff;
  font-size: 12px;
  font-weight: 600;
  min-width: 65px;
  letter-spacing: 0.3px;
}

.info-value {
  color: #eaf6ff;
  font-size: 13px;
  font-weight: 500;
  text-align: right;
  flex: 1;
  margin-left: 12px;
  word-break: break-all;
}

.vm-template-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;
}

.vm-template-item {
  background: rgba(0, 234, 255, 0.06);
  border: 1px solid rgba(0, 234, 255, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  transition: all 0.2s ease;
}

.vm-template-item:hover {
  background: rgba(0, 234, 255, 0.1);
  border-color: rgba(0, 234, 255, 0.35);
}

.vm-template-item.full-width {
  grid-column: 1 / -1;
}

.item-label {
  color: #4ecfff;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.item-value {
  color: #eaf6ff;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  min-width: 56px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.role-public {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
  color: #e0f2f1;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
}

.role-red {
  background: linear-gradient(135deg, rgba(255, 68, 68, 0.35), rgba(255, 100, 100, 0.15));
  color: #ff8888;
  border: 1.5px solid rgba(255, 68, 68, 0.6);
}

.role-blue {
  background: linear-gradient(135deg, rgba(0, 168, 255, 0.35), rgba(100, 200, 255, 0.15));
  color: #64d9ff;
  border: 1.5px solid rgba(0, 168, 255, 0.6);
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  min-width: 56px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.status-up {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.35), rgba(102, 200, 100, 0.15));
  color: #81c784;
  border: 1.5px solid rgba(76, 175, 80, 0.6);
}

.status-down {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.35), rgba(255, 100, 88, 0.15));
  color: #ef5350;
  border: 1.5px solid rgba(244, 67, 54, 0.6);
}

.context-menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1999;
}

.data-manage-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2001;
  background: linear-gradient(135deg, #0f1929 0%, #1a2847 100%);
  border: 1.5px solid rgba(0, 234, 255, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  width: 90%;
  max-width: 400px;
  backdrop-filter: blur(8px);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 234, 255, 0.2);
  color: #00eaff;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #00eaff;
  font-size: 24px;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #fff;
}

.panel-content {
  padding: 20px;
}

.placeholder {
  text-align: center;
  color: rgba(0, 234, 255, 0.5);
  padding: 40px 20px;
}

/* 故障设置样式 */
.fault-config {
  padding: 12px;
  background: rgba(0, 234, 255, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(0, 234, 255, 0.2);
}

.fault-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.fault-label {
  color: #4ecfff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

/* 为 ElSwitch 自定义样式 */
:deep(.el-switch) {
  --el-switch-on-color: #ff4949;
  --el-switch-off-color: #13ce66;
}

:deep(.el-switch__label) {
  color: #eaf6ff;
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
}

/* 节点操作悬浮卡片 */
.operation-card {
  position: relative;
  z-index: 2001;
  background: linear-gradient(135deg, #0f1929 0%, #1a2847 100%);
  border: 1.5px solid rgba(0, 234, 255, 0.4);
  border-left: none;
  border-radius: 0 12px 12px 0;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.7),
    0 0 20px rgba(0, 234, 255, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  width: 360px;
  max-height: 600px;
  padding: 18px;
  animation: cardAppear 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
  backdrop-filter: blur(10px);
  overflow-y: auto;
}

.operation-section {
  margin-bottom: 0;
}

.operation-section:not(:first-child) {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(0, 234, 255, 0.15);
}

.operation-section .section-title {
  color: #00eaff;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 0.8px;
  padding-left: 8px;
  border-left: 3px solid rgba(0, 234, 255, 0.8);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}

.operation-section .section-title svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 操作按钮组样式 */
.operation-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.operation-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid rgba(0, 234, 255, 0.3);
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(0, 234, 255, 0.08), rgba(100, 200, 255, 0.05));
  color: #64d9ff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.operation-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  transition: left 0.5s;
}

.operation-btn:hover {
  border-color: rgba(0, 234, 255, 0.6);
  background: linear-gradient(135deg, rgba(0, 234, 255, 0.15), rgba(100, 200, 255, 0.12));
  box-shadow: 
    0 0 15px rgba(0, 234, 255, 0.25),
    inset 0 0 10px rgba(0, 234, 255, 0.1);
  color: #00eaff;
  transform: translateY(-2px);
}

.operation-btn:hover::before {
  left: 100%;
}

.operation-btn:active {
  transform: translateY(0);
  box-shadow: inset 0 0 10px rgba(0, 234, 255, 0.15);
}

.operation-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* 不同按钮的颜色主题 */
.operation-btn.signal-btn {
  border-color: rgba(255, 200, 0, 0.3);
  background: linear-gradient(135deg, rgba(255, 200, 0, 0.08), rgba(255, 180, 0, 0.05));
  color: #ffc800;
}

.operation-btn.signal-btn:hover {
  border-color: rgba(255, 200, 0, 0.6);
  background: linear-gradient(135deg, rgba(255, 200, 0, 0.15), rgba(255, 180, 0, 0.12));
  box-shadow: 
    0 0 15px rgba(255, 200, 0, 0.25),
    inset 0 0 10px rgba(255, 200, 0, 0.1);
  color: #ffdc4d;
}

.operation-btn.terminal-btn {
  border-color: rgba(76, 175, 80, 0.3);
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08), rgba(56, 142, 60, 0.05));
  color: #81c784;
}

.operation-btn.terminal-btn:hover {
  border-color: rgba(76, 175, 80, 0.6);
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(56, 142, 60, 0.12));
  box-shadow: 
    0 0 15px rgba(76, 175, 80, 0.25),
    inset 0 0 10px rgba(76, 175, 80, 0.1);
  color: #a5d6a7;
}

.operation-btn.delete-btn {
  border-color: rgba(244, 67, 54, 0.3);
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.08), rgba(229, 57, 53, 0.05));
  color: #ef5350;
}

.operation-btn.delete-btn:hover {
  border-color: rgba(244, 67, 54, 0.6);
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.15), rgba(229, 57, 53, 0.12));
  box-shadow: 
    0 0 15px rgba(244, 67, 54, 0.25),
    inset 0 0 10px rgba(244, 67, 54, 0.1);
  color: #ff8a80;
}

/* 虚拟机启动按钮 */
.operation-btn.vm-start-btn {
  border-color: rgba(76, 175, 80, 0.3);
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08), rgba(56, 142, 60, 0.05));
  color: #81c784;
}

.operation-btn.vm-start-btn:hover {
  border-color: rgba(76, 175, 80, 0.6);
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(56, 142, 60, 0.12));
  box-shadow: 
    0 0 15px rgba(76, 175, 80, 0.25),
    inset 0 0 10px rgba(76, 175, 80, 0.1);
  color: #a5d6a7;
}

/* 虚拟机关闭按钮 */
.operation-btn.vm-stop-btn {
  border-color: rgba(244, 67, 54, 0.3);
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.08), rgba(229, 57, 53, 0.05));
  color: #ef5350;
}

.operation-btn.vm-stop-btn:hover {
  border-color: rgba(244, 67, 54, 0.6);
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.15), rgba(229, 57, 53, 0.12));
  box-shadow: 
    0 0 15px rgba(244, 67, 54, 0.25),
    inset 0 0 10px rgba(244, 67, 54, 0.1);
  color: #ff8a80;
}

/* 虚拟机参数编辑按钮 */
.operation-btn.vm-edit-btn {
  border-color: rgba(255, 200, 0, 0.3);
  background: linear-gradient(135deg, rgba(255, 200, 0, 0.08), rgba(255, 180, 0, 0.05));
  color: #ffc800;
}

.operation-btn.vm-edit-btn:hover {
  border-color: rgba(255, 200, 0, 0.6);
  background: linear-gradient(135deg, rgba(255, 200, 0, 0.15), rgba(255, 180, 0, 0.12));
  box-shadow: 
    0 0 15px rgba(255, 200, 0, 0.25),
    inset 0 0 10px rgba(255, 200, 0, 0.1);
  color: #ffdc4d;
}

/* 协议配置按钮 */
.operation-btn.protocol-btn {
  border-color: rgba(102, 179, 255, 0.3);
  background: linear-gradient(135deg, rgba(102, 179, 255, 0.08), rgba(100, 150, 255, 0.05));
  color: #66b3ff;
}

.operation-btn.protocol-btn:hover {
  border-color: rgba(102, 179, 255, 0.6);
  background: linear-gradient(135deg, rgba(102, 179, 255, 0.15), rgba(100, 150, 255, 0.12));
  box-shadow: 
    0 0 15px rgba(102, 179, 255, 0.25),
    inset 0 0 10px rgba(102, 179, 255, 0.1);
  color: #99ccff;
}

/* 静态路由配置按钮 */
.operation-btn.static-route-btn {
  border-color: rgba(153, 102, 255, 0.3);
  background: linear-gradient(135deg, rgba(153, 102, 255, 0.08), rgba(150, 100, 255, 0.05));
  color: #9966ff;
}

.operation-btn.static-route-btn:hover {
  border-color: rgba(153, 102, 255, 0.6);
  background: linear-gradient(135deg, rgba(153, 102, 255, 0.15), rgba(150, 100, 255, 0.12));
  box-shadow: 
    0 0 15px rgba(153, 102, 255, 0.25),
    inset 0 0 10px rgba(153, 102, 255, 0.1);
  color: #b399ff;
}

/* 故障配置样式 */
.fault-config {
  padding: 0;
}

.fault-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(0, 234, 255, 0.06);
  border-radius: 6px;
  border: 1px solid rgba(0, 234, 255, 0.2);
  transition: all 0.2s ease;
}

.fault-item:hover {
  background: rgba(0, 234, 255, 0.1);
  border-color: rgba(0, 234, 255, 0.35);
}

.fault-label {
  font-size: 13px;
  color: #64d9ff;
  font-weight: 500;
}

/* 协议信息悬浮卡片 */
.protocol-info-card {
  position: relative;
  z-index: 2001;
  background: linear-gradient(135deg, #0f1929 0%, #1a2847 100%);
  border: 1.5px solid rgba(0, 234, 255, 0.4);
  border-left: none;
  border-radius: 0 12px 12px 0;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.7),
    0 0 20px rgba(0, 234, 255, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  width: 320px;
  padding: 18px;
  animation: cardAppear 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.protocol-section {
  margin-bottom: 0;
}

.protocol-section .section-title {
  color: #00eaff;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 10px;
  letter-spacing: 0.8px;
  padding-left: 8px;
  border-left: 3px solid rgba(0, 234, 255, 0.8);
  text-transform: uppercase;
}

.protocol-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.protocol-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background: rgba(0, 234, 255, 0.06);
  border-radius: 6px;
  border: 1px solid rgba(0, 234, 255, 0.2);
  transition: all 0.2s ease;
}

.protocol-item:hover {
  background: rgba(0, 234, 255, 0.1);
  border-color: rgba(0, 234, 255, 0.35);
}

.protocol-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(0, 168, 255, 0.35), rgba(100, 200, 255, 0.15));
  color: #64d9ff;
  border: 1.5px solid rgba(0, 168, 255, 0.6);
  letter-spacing: 0.3px;
  flex: 1;
}

.no-protocol {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 10px;
}

.no-protocol-text {
  text-align: center;
  color: rgba(0, 234, 255, 0.5);
  font-size: 12px;
}

/* 数据管理悬浮卡片 */
.data-manage-card {
  position: relative;
  z-index: 2001;
  background: linear-gradient(135deg, #0f1929 0%, #1a2847 100%);
  border: 1.5px solid rgba(0, 234, 255, 0.4);
  border-left: none;
  border-radius: 0 12px 12px 0;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.7),
    0 0 20px rgba(0, 234, 255, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  width: 320px;
  padding: 18px;
  animation: cardAppear 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.data-manage-section {
  margin-bottom: 0;
}

.data-manage-section .section-title {
  color: #00eaff;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 10px;
  letter-spacing: 0.8px;
  padding-left: 8px;
  border-left: 3px solid rgba(0, 234, 255, 0.8);
  text-transform: uppercase;
}

.data-manage-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  background: rgba(0, 234, 255, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(0, 234, 255, 0.2);
}

.placeholder-text {
  text-align: center;
  color: rgba(0, 234, 255, 0.5);
  font-size: 12px;
}
</style>
