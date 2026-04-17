<template>
  <aside class="sidebar">
    <div class="sidebar-content">
      <div v-for="(category, index) in categories" :key="index" class="sidebar-category">
        <div class="category-header" @click="toggleCategory(index)">
          <div class="header-content">
            {{ category.title }}
          </div>
          <div class="collapse-icon">
            <el-icon :class="{ 'collapsed': collapsedCategories[index] }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>
        <div class="category-content" :class="{ 'collapsed': collapsedCategories[index] }">
          <div 
            v-for="(item, idx) in category.items" 
            :key="idx" 
            class="category-item"
            :class="{ 'active': isItemActive(item) }"
            @click="handleItemClick(item, category.type)"
          >
            <div class="item-icon">
              <el-icon>
                <component :is="getIconComponent(item.icon)" />
              </el-icon>
            </div>
            <div class="item-name">{{ item.name }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="tech-effect-footer">
      <div class="tech-line-horizontal"></div>
      <div class="tech-line-vertical"></div>
      <div class="tech-scan-beam"></div>
      <div class="tech-dots">
        <div class="tech-dot" v-for="i in 6" :key="i"></div>
      </div>
      <div class="tech-glow"></div>
      <div class="tech-circles">
        <div class="tech-circle circle-1"></div>
        <div class="tech-circle circle-2"></div>
        <div class="tech-circle circle-3"></div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { type Component, ref, computed, onMounted, watch } from 'vue';
import {
  Monitor, Location, Connection, Link, Collection, CollectionTag,
  Delete, DataLine, SetUp, OfficeBuilding, ArrowDown, ChromeFilled,
  Message, MessageBox, Microphone, VideoCamera, Cloudy, Lock,Van

} from '@element-plus/icons-vue';
import { Drone, Server, NetworkDrive } from '@icon-park/vue-next';
import { getTopoBySession } from '../../../api/scene';
import { useTopoStore } from '../../../store/modules/topo';
import { useSystemLogStore } from '../../../store/modules/systemLog';
import { ElMessage } from 'element-plus';
import eventBus from '../../../utils/eventBus';
import type { Node } from '../../../types/topo';

const topoStore = useTopoStore();
const systemLogStore = useSystemLogStore();

const selectedItem = ref<{name: string, icon: string, type?: string} | null>(null);

const collapsedCategories = ref<Record<number, boolean>>({});

// 分布式场景设置
const isDistributedScene = ref(false);

// 获取场景分布式设置
const fetchSceneDistributedSetting = async () => {
  try {
    const sessionId = topoStore.currentSessionId ?? topoStore.topoData?.id;
    if (sessionId) {
      // 尝试从 topo API 响应中获取场景信息
      const res = await getTopoBySession(sessionId);
      const data = res?.data?.data ?? res?.data;
      
      // 检查响应中是否包含 disturb 信息
      if (data && typeof data === 'object') {
        if ('disturb' in data) {
          isDistributedScene.value = data.disturb === 1;
          return;
        }
      }
      
      // 如果直接获取不到，检查 topoData 中的 metadata 或 options
      const topoData = topoStore.topoData;
      if (topoData?.metadata && topoData.metadata.disturb) {
        isDistributedScene.value = topoData.metadata.disturb === '1';
      } else if (topoData?.options && topoData.options.disturb) {
        isDistributedScene.value = topoData.options.disturb === '1';
      } else {
        isDistributedScene.value = false;
      }
    }
  } catch (error) {
    console.error('SideBar - 获取场景分布式设置失败:', error);
    isDistributedScene.value = false;
  }
};

const toggleCategory = (index: number) => {
  if (collapsedCategories.value[index]) {
    collapsedCategories.value[index] = false;
  } else {
    collapsedCategories.value[index] = true;
  }
};

const getIconComponent = (iconName: string): Component => {
  const iconMap: Record<string, Component> = {
    'Monitor': Monitor,
    'Location': Location,
    'Connection': Connection,
    'Link': Link,
    'Collection': Collection,
    'CollectionTag': CollectionTag,
    'Delete': Delete,
    'DRONE':Drone,
    'Van': Van,
    'Server': Server,
    'NetworkDrive': NetworkDrive,
    'DataLine': DataLine,
    'SetUp': SetUp,
    'OfficeBuilding': OfficeBuilding,
    'ArrowDown': ArrowDown,
    'HTTP':ChromeFilled,
    'FTP': MessageBox,
    'SMTP': Message,
    'DNS': Cloudy,
    'VoIP-SIP': Microphone,
    'TLS': ChromeFilled,
    'RTSP-RTP': VideoCamera,
    'MQTT': Message,
    'CoAP': ChromeFilled,
    'DDS': DataLine,
    'SSH': SetUp,
    'PKI': ChromeFilled,
    'Lock': Lock,
  };

  return iconMap[iconName] || Monitor;
};

const isItemActive = (item: {name: string, icon: string, type?: string}): boolean => {
  return selectedItem.value?.name === item.name &&
         topoStore.operationMode === 'add';
};

const deviceTypeMap: Record<string, string> = {
  '虚拟机': 'VMNODE',
  '无人机': 'DRONE',
  '机动车': 'DRONE',
  '卫星': 'DRONE',
  '路由器': 'ROUTER',
  '交换机': 'SWITCH',
  '基站': 'BASESTATION',
  '视频服务器': 'RTSP-RTP',
  '流量终端': 'TMV',
  '攻击机': 'ATTACK_MACHINE',
  '安全机': 'SECURITY_MACHINE',
  'SDN控制器': 'SDN_CONTROLLER',
  'Ovs交换机': 'Ovs_SWITCH',
  'P4交换机': 'P4_SWITCH',
  'SR交换机': 'SR_SWITCH',
  '业务终端': 'BUSINESS_Transmitter',
  'PKI模型': 'PKI'
};

// 机动车和卫星的特殊标识映射
const deviceSubTypeMap: Record<string, string> = {
  '机动车': 'VAN',
  '卫星': 'SATELLITE'
};

const hardwareTypeMap: Record<string, string> = {
  '添加半实物': 'RJ45'
};

const applicationTypeMap: Record<string, string> = {
  'HTTP': 'HTTP',
  'FTP': 'FTP',
  'DNS': 'DNS',
  'SMTP': 'SMTP',
  'VoIP-SIP': 'VoIP-SIP',
  'TLS': 'TLS',
  'MQTT': 'MQTT',
  'CoAP': 'CoAP',
  'DDS': 'DDS',
  'SSH': 'SSH',
};

const subnetTypeMap: Record<string, string> = {
  '添加子网': 'EMANE'
};

const handleItemClick = (item: {name: string, icon: string, type?: string}, categoryType: string) => {
  if (categoryType === 'device' || categoryType === 'business') {
    selectedItem.value = item;

    const deviceType = deviceTypeMap[item.name] || 'DEVICE';
    const deviceSubType = deviceSubTypeMap[item.name] || null;

    // @ts-ignore: 忽略类型检查错误，该方法确实存在
    topoStore.setOperationMode('add');

    // @ts-ignore: 忽略类型检查错误，该方法确实存在
    topoStore.setSelectedNodeType(deviceType);

    // @ts-ignore: 设置节点子类型
    topoStore.setSelectedNodeSubType(deviceSubType);

    item.type = deviceType;

    systemLogStore.addLog({
      type: 'normal',
      module: 'ui',
      action: '切换操作模式',
      information: '操作模式切换',
      details: `进入${item.name}放置模式`
    });

    ElMessage.success(`已进入${item.name}放置模式，点击地图放置节点,右键退出放置模式`);
  } else if (categoryType === 'link') {
    if (item.name === '添加链路') {
      selectedItem.value = item;
      
      if (!topoStore.topoData?.nodes || topoStore.topoData.nodes.length < 2) {
        ElMessage.warning('至少需要两个节点才能创建链路');
        return;
      }
      
      // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setOperationMode('connect');
      
      eventBus.emit('sidebar:item-selected', item);

        systemLogStore.addLog({
        type: 'normal',
        module: 'ui',
        action: '切换操作模式',
        information: '操作模式切换',
        details: '进入链路连接模式'
      });
      
      ElMessage.success('已进入链路连接模式，请依次点击两个节点建立连接，右键退出连接模式');
    } else if (item.name === '删除链路') {
      selectedItem.value = item;
      
      if (!topoStore.topoData?.links || topoStore.topoData.links.length === 0) {
        ElMessage.warning('当前没有可删除的链路');
        return;
      }
      
      // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setOperationMode('connect');
      
      eventBus.emit('sidebar:item-selected', item);

        systemLogStore.addLog({
        type: 'normal',
        module: 'ui',
        action: '切换操作模式',
        information: '操作模式切换',
        details: '进入链路删除模式'
      });
      
      ElMessage.success('已进入链路删除模式，请点击要删除的链路，右键退出删除模式');
    } else if (item.name === '分布式链路配置') {
      selectedItem.value = item;

      // 检查是否有可配置的节点（无人机或路由器）
      const droneNodes = topoStore.topoData?.nodes?.filter((node: Node) => node.type === 'DRONE') || [];
      const routerNodes = topoStore.topoData?.nodes?.filter((node: Node) =>
        node.type === 'DEFAULT' && node.model === 'router'
      ) || [];
      const totalConfigurableNodes = droneNodes.length + routerNodes.length;

      if (totalConfigurableNodes === 0) {
        ElMessage.warning('当前场景中没有可配置的节点（无人机或路由器），无法进行分布式链路配置');
        return;
      }


      // 发送事件给父组件打开分布式链路配置对话框
      eventBus.emit('sidebar:distributed-link-config', item);

      systemLogStore.addLog({
        type: 'normal',
        module: 'ui',
        action: '打开对话框',
        information: '分布式链路配置',
        details: '打开分布式链路配置对话框'
      });

      ElMessage.success('打开分布式链路配置面板');
    }
  } else if (categoryType === 'subnet') {
    if (item.name === '添加子网') {
      selectedItem.value = item;
      
      const subnetType = subnetTypeMap[item.name] || 'EMANE';
      
        // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setOperationMode('add');
      
        // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setSelectedNodeType(subnetType);
      
      item.type = subnetType;
      
      eventBus.emit('sidebar:item-selected', item);

        systemLogStore.addLog({
        type: 'normal',
        module: 'ui',
        action: '切换操作模式',
        information: '操作模式切换',
        details: '进入子网放置模式'
      });
      
      ElMessage.success('已进入子网放置模式，点击地图放置子网节点，右键退出放置模式');
    } else if (item.name === '删除子网') {
      selectedItem.value = item;
      
      const emaneNodes = topoStore.topoData?.nodes?.filter((node: Node) => node.type === 'EMANE') || [];
      if (emaneNodes.length === 0) {
        ElMessage.warning('当前没有可删除的子网');
        return;
      }
      
      // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setOperationMode('select');
      
      // @ts-ignore: 暂时忽略类型检查错误
      eventBus.emit('sidebar:delete-subnet', item);

        systemLogStore.addLog({
        type: 'normal',
        module: 'ui',
        action: '切换操作模式',
        information: '操作模式切换',
        details: '进入子网删除模式'
      });
      
      ElMessage.success('已进入子网删除模式，请点击要删除的子网节点');
    }
  } else if (categoryType === 'interference') {
    if (item.name === '添加干扰') {
      selectedItem.value = item;
      // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setOperationMode('add');
      // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setSelectedNodeType('INTERFERENCE');
      item.type = 'INTERFERENCE';
      
      eventBus.emit('sidebar:item-selected', item); // Assuming generic item selection is sufficient for now

        systemLogStore.addLog({
        type: 'normal',
        module: 'ui',
        action: '切换操作模式',
        information: '操作模式切换',
        details: '进入干扰放置模式'
      });
      
      ElMessage.success('已进入干扰放置模式，点击地图放置干扰节点，右键退出放置模式');
    } else if (item.name === '删除干扰') {
      selectedItem.value = item;
      const interferenceNodes = topoStore.topoData?.nodes?.filter((node: Node) => node.type === 'INTERFERENCE') || [];
      if (interferenceNodes.length === 0) {
        ElMessage.warning('当前没有可删除的干扰');
        return;
      }
      // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setOperationMode('select'); // Or a new mode like 'delete-interference'
      
      // @ts-ignore: 暂时忽略类型检查错误
      eventBus.emit('sidebar:delete-interference', item);

        systemLogStore.addLog({
        type: 'normal',
        module: 'ui',
        action: '切换操作模式',
        information: '操作模式切换',
        details: '进入干扰删除模式'
      });
      
      ElMessage.success('已进入干扰删除模式，请点击要删除的干扰节点');
    }
  } else if (categoryType === 'hardware') {
    if (item.name === '添加半实物') {
      selectedItem.value = item;

      const hardwareType = hardwareTypeMap[item.name] || 'RJ45';

        // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setOperationMode('add');

        // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setSelectedNodeType(hardwareType);

      item.type = hardwareType;

        systemLogStore.addLog({
        type: 'normal',
        module: 'ui',
        action: '切换操作模式',
        information: '操作模式切换',
        details: '进入半实物节点放置模式'
      });

      ElMessage.success('已进入半实物节点放置模式，点击地图放置节点，右键退出放置模式');
    } else if (item.name === '删除半实物') {
      selectedItem.value = item;

      const hardwareNodes = topoStore.topoData?.nodes?.filter((node: Node) => node.type === 'RJ45') || [];
      if (hardwareNodes.length === 0) {
        ElMessage.warning('当前没有可删除的半实物节点');
        return;
      }

      // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setOperationMode('select');

      // @ts-ignore: 暂时忽略类型检查错误
      eventBus.emit('sidebar:delete-hardware', item);

        systemLogStore.addLog({
        type: 'normal',
        module: 'ui',
        action: '切换操作模式',
        information: '操作模式切换',
        details: '进入半实物节点删除模式'
      });

      ElMessage.success('已进入半实物节点删除模式，请点击要删除的半实物节点');
    }
  } else if (categoryType === 'application') {
    selectedItem.value = item;

    const appType = applicationTypeMap[item.name];
    if (appType) {
      // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setOperationMode('add');

      // @ts-ignore: 忽略类型检查错误，该方法确实存在
      topoStore.setSelectedNodeType(appType);

      systemLogStore.addLog({
        type: 'normal',
        module: 'application',
        action: '进入放置模式',
        information: '应用层模型放置',
        details: `准备放置应用层模型: ${item.name}`
      });

      ElMessage.success(`已进入${item.name}模型放置模式，请在地图上点击放置位置`);
    } else {
      ElMessage.error(`未知的应用层模型类型: ${item.name}`);
    }
  } else {
    systemLogStore.addLog({
      type: 'normal',
      module: 'ui',
      action: '选择功能',
      information: '功能选择',
      details: `选择了功能: ${item.name}`
    });
    
    ElMessage.info('该功能尚未实现');
  }
};

const allCategories = [
  {
    title: '设备管理',
    type: 'device',
    items: [
      { name: '虚拟机', icon: 'Server' },
      { name: '无人机', icon: 'DRONE' },
      { name: '机动车', icon: 'Van' },
      { name: '卫星', icon: 'Cloudy' },
      { name: '路由器', icon: 'NetworkDrive' },
      { name: '交换机', icon: 'DataLine' },
      { name: '基站', icon: 'OfficeBuilding' },
      { name: '视频服务器', icon: 'RTSP-RTP' },
      { name: '攻击机', icon: 'Monitor' },
      { name: '安全机', icon: 'Lock' },
      { name: 'SDN控制器', icon: 'SetUp' },
      { name: 'Ovs交换机', icon: 'Connection' },
      { name: 'P4交换机', icon: 'DataLine' },
      { name: 'SR交换机', icon: 'DataLine' },
      { name: 'PKI模型', icon: 'PKI' },
    ]
  },
  {
    title: '链路管理',
    type: 'link',
    items: [
      { name: '添加链路', icon: 'Link' },
      { name: '删除链路', icon: 'Delete' }
    ]
  },
  {
    title: '子网管理',
    type: 'subnet',
    items: [
      { name: '添加子网', icon: 'Connection' },
      { name: '删除子网', icon: 'Delete' }
    ]
  },
  {
    title: '干扰管理',
    type: 'interference',
    items: [
      { name: '添加干扰', icon: 'SetUp' },
      { name: '删除干扰', icon: 'Delete' }
    ]
  },
  {
    title: '半实物管理',
    type: 'hardware',
    items: [
      { name: '添加半实物', icon: 'Collection' },
      { name: '删除半实物', icon: 'Delete' }
    ]
  }, 
 {
    title: '业务管理',
    type: 'business',
    items: [
      { name: '流量终端', icon: 'Monitor' },
      { name: '业务终端', icon: 'DataLine' },
    ]
  },
  {
    title: '应用层模型管理',
    type: 'application',
    items: [
      { name: 'HTTP', icon: 'HTTP' },
      { name: 'TLS', icon: 'TLS' },
      { name: 'FTP', icon: 'FTP' },
      { name: 'DNS', icon: 'DNS' },
      { name: 'SMTP', icon: 'SMTP' },
      { name: 'VoIP-SIP', icon: 'VoIP-SIP' },
      { name: 'MQTT', icon: 'MQTT' },
      { name: 'CoAP', icon: 'CoAP' },
      { name: 'DDS', icon: 'DDS' },
      { name: 'SSH', icon: 'SSH' },
    ]
  }
];

// 根据场景类型过滤分类
const categories = computed(() => {
  if (isDistributedScene.value) {
    // 分布式场景只显示：设备管理中的无人机和路由器、链路管理、子网管理
    return [
      {
        title: '设备管理',
        type: 'device',
        items: [
          { name: '无人机', icon: 'Drone' },
          { name: '路由器', icon: 'NetworkDrive' }
        ]
      },
      {
        title: '链路管理',
        type: 'link',
        items: [
          { name: '添加链路', icon: 'Link' },
          { name: '分布式链路配置', icon: 'Connection' },
          { name: '删除链路', icon: 'Delete' }
        ]
      },
      {
        title: '子网管理',
        type: 'subnet',
        items: [
          { name: '添加子网', icon: 'Connection' },
          { name: '删除子网', icon: 'Delete' }
        ]
      }
    ];
  }
  // 非分布式场景显示所有分类
  return allCategories;
});

// 组件挂载时获取分布式设置
onMounted(() => {
  fetchSceneDistributedSetting();
});

// 监听 topoData 变化，重新获取分布式设置
watch(
  () => topoStore.topoData,
  (newTopoData) => {
    if (newTopoData) {
      fetchSceneDistributedSetting();
    }
  },
  { deep: true }
);

// 监听 currentSessionId 变化
watch(
  () => topoStore.currentSessionId,
  (newSessionId) => {
    if (newSessionId) {
      fetchSceneDistributedSetting();
    }
  }
);

</script>

<style scoped>
.sidebar {
  width: 200px;
  height: 100%;
  background: linear-gradient(180deg, var(--sidebar-bg-from, #0a1228) 0%, var(--sidebar-bg-middle, #1a1a40) 50%, var(--sidebar-bg-to, #2c0a16) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-right: 1px solid var(--border-color, rgba(120, 60, 255, 0.15));
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
  color: var(--primary-text-color, #d6e5ff);
  position: relative;
  box-shadow: inset -5px 0 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

.sidebar-content::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.sidebar::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: linear-gradient(180deg, transparent, var(--primary-color, rgba(120, 60, 255, 0.4)), var(--secondary-color, rgba(255, 60, 120, 0.4)), transparent);
  z-index: 1;
}

.sidebar-category {
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border-color, rgba(120, 60, 255, 0.1));
  padding-bottom: 4px;
  position: relative;
}

.sidebar-category:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.sidebar-category::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-color, rgba(120, 60, 255, 0.3)), var(--secondary-color, rgba(255, 60, 120, 0.3)), transparent);
}

.category-header {
  padding: 8px 16px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--primary-color, #a48fff);
  font-size: 14px;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, rgba(120, 60, 255, 0.05) 0%, rgba(120, 60, 255, 0.15) 50%, rgba(255, 60, 120, 0.15) 100%);
  border-radius: 8px;
  margin: 0 8px 8px 8px;
  position: relative;
  overflow: hidden;
  text-shadow: 0 0 10px var(--shadow-color, rgba(120, 60, 255, 0.4));
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.category-header::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-color, rgba(120, 60, 255, 0.5)), var(--secondary-color, rgba(255, 60, 120, 0.5)), transparent);
  z-index: 1;
}

.collapse-icon {
  transition: transform 0.3s;
}

.collapse-icon .el-icon {
  color: var(--primary-color, #a48fff);
  font-size: 14px;
  transition: all 0.3s;
}

.collapse-icon .el-icon.collapsed {
  transform: rotate(-90deg);
}

.category-header:hover .el-icon {
  color: var(--primary-text-color, #ffffff);
  text-shadow: 0 0 8px var(--glow-color, rgba(120, 60, 255, 0.8));
}

.category-content {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 8px 8px 8px;
  justify-content: space-between;
  max-height: 1000px;
  overflow-y: auto;
  overflow-x: hidden;
  transition: max-height 0.3s ease;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 60, 255, 0.3) transparent;
}

.category-content::-webkit-scrollbar {
  width: 4px;
}

.category-content::-webkit-scrollbar-track {
  background: transparent;
}

.category-content::-webkit-scrollbar-thumb {
  background: rgba(120, 60, 255, 0.3);
  border-radius: 2px;
}

.category-content::-webkit-scrollbar-thumb:hover {
  background: rgba(120, 60, 255, 0.5);
}

.category-content.collapsed {
  max-height: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.header-content {
  flex: 1;
}

.category-item {
  width: calc(50% - 3px);
  box-sizing: border-box;
  padding: 6px 0;
  text-align: center;
  cursor: pointer;
  color: var(--primary-text-color, #d6e5ff);
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
  font-size: 12px;
  transition: all 0.3s;
  border-radius: 6px;
  margin-bottom: 4px;
  background: var(--hover-color, rgba(120, 60, 255, 0.05));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border-color, rgba(120, 60, 255, 0.05));
}

.category-item::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, var(--primary-color, rgba(120, 60, 255, 0.1)), var(--secondary-color, rgba(255, 60, 120, 0.1)), transparent);
  transition: left 0.5s;
}

.category-item:hover::before {
  left: 100%;
}

.category-item:hover {
  background-color: var(--hover-color, rgba(120, 60, 255, 0.1));
  color: var(--primary-text-color, #ffffff);
  transform: translateY(-2px);
  border: 1px solid var(--border-color, rgba(120, 60, 255, 0.2));
  box-shadow: 0 0 15px var(--shadow-color, rgba(120, 60, 255, 0.1));
}

.category-item.active {
  background: linear-gradient(135deg, var(--hover-color, rgba(120, 60, 255, 0.1)), var(--secondary-color, rgba(255, 60, 120, 0.2)));
  color: var(--primary-text-color, #ffffff);
  box-shadow: 0 0 15px var(--shadow-color, rgba(255, 60, 120, 0.2));
  border: 1px solid var(--secondary-color, rgba(255, 60, 120, 0.3));
  transform: translateY(-2px);
}

.item-icon {
  font-size: 18px;
  margin-bottom: 2px;
  color: var(--primary-text-color, #d6e5ff);
  transition: all 0.3s;
  position: relative;
}

.category-item:hover .item-icon {
  color: var(--primary-text-color, #ffffff);
  transform: scale(1.1);
  text-shadow: 0 0 8px var(--glow-color, rgba(120, 60, 255, 0.6));
}

.category-item.active .item-icon {
  color: var(--primary-text-color, #ffffff);
  text-shadow: 0 0 8px var(--secondary-color, rgba(255, 60, 120, 0.6));
}

.item-name {
  font-size: 12px;
  font-weight: 400;
  transition: all 0.3s;
}

.category-item:hover .item-name {
  text-shadow: 0 0 5px var(--glow-color, rgba(120, 60, 255, 0.4));
}

.category-item.active .item-name {
  text-shadow: 0 0 5px var(--secondary-color, rgba(255, 60, 120, 0.4));
}

.tech-effect-footer {
  position: relative;
  height: 80px;
  min-height: 80px;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, transparent, rgba(120, 60, 255, 0.05), rgba(255, 60, 120, 0.05));
  border-top: 1px solid rgba(120, 60, 255, 0.1);
  margin-top: auto;
}

.tech-line-horizontal {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 20px;
  height: 30px;
  background:
    linear-gradient(transparent, transparent 7px, rgba(120, 60, 255, 0.1) 7px, rgba(120, 60, 255, 0.1) 8px, transparent 8px) 0 0,
    linear-gradient(transparent, transparent 15px, rgba(255, 60, 120, 0.2) 15px, rgba(255, 60, 120, 0.2) 16px, transparent 16px) 0 0,
    linear-gradient(transparent, transparent 23px, rgba(120, 60, 255, 0.1) 23px, rgba(120, 60, 255, 0.1) 24px, transparent 24px) 0 0;
  animation: line-flow 15s linear infinite;
}

@keyframes line-flow {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}

.tech-line-vertical {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 1px;
  height: 50px;
  background: linear-gradient(to top, rgba(255, 60, 120, 0.5), rgba(120, 60, 255, 0.3), transparent);
  transform: translateX(-50%);
}

.tech-line-vertical::before, .tech-line-vertical::after {
  content: "";
  position: absolute;
  width: 1px;
  height: 30px;
}

.tech-line-vertical::before {
  left: -10px;
  background: linear-gradient(to top, rgba(255, 60, 120, 0.3), transparent);
}

.tech-line-vertical::after {
  right: -10px;
  background: linear-gradient(to top, rgba(120, 60, 255, 0.3), transparent);
}

.tech-scan-beam {
  position: absolute;
  top: 0;
  left: -20%;
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(120, 60, 255, 0.05), rgba(255, 60, 120, 0.05), transparent);
  animation: scan-move 4s linear infinite;
}

@keyframes scan-move {
  0% { left: -20%; }
  100% { left: 100%; }
}

.tech-dots {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
}

.tech-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  animation: dot-pulse 2s ease-in-out infinite;
}

.tech-dot:nth-child(odd) {
  background-color: rgba(120, 60, 255, 0.5);
}

.tech-dot:nth-child(even) {
  background-color: rgba(255, 60, 120, 0.5);
}

.tech-dot:nth-child(2n) {
  animation-delay: 0.4s;
}

.tech-dot:nth-child(3n) {
  animation-delay: 0.8s;
}

@keyframes dot-pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.5); opacity: 1; }
}

.tech-glow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: radial-gradient(ellipse at center bottom, rgba(120, 60, 255, 0.2) 0%, rgba(255, 60, 120, 0.1) 40%, transparent 70%);
  animation: glow-pulse 4s ease-in-out infinite alternate;
}

@keyframes glow-pulse {
  0% { opacity: 0.3; }
  100% { opacity: 0.7; }
}

.tech-circles {
  position: absolute;
  bottom: 25px;
  right: 15px;
  width: 20px;
  height: 20px;
}

.tech-circle {
  position: absolute;
  border-radius: 50%;
  transform-origin: center;
}

.circle-1 {
  width: 12px;
  height: 12px;
  border: 1px solid rgba(255, 60, 120, 0.5);
  animation: circle-rotate 10s linear infinite;
}

.circle-2 {
  width: 18px;
  height: 18px;
  border: 1px solid rgba(120, 60, 255, 0.5);
  animation: circle-rotate 15s linear infinite reverse;
}

.circle-3 {
  width: 24px;
  height: 24px;
  border: 1px solid rgba(180, 60, 180, 0.5);
  animation: circle-rotate 20s linear infinite;
}

@keyframes circle-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 