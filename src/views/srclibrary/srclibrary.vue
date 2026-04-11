<template>
    <div class="network-container">
        <el-container>
            <!-- 左侧侧边栏 -->
            <el-aside width="220px" class="side-menu">
                <el-menu :default-active="activeMenuItem" class="vertical-menu" @select="handleMenuSelect">
                    <el-sub-menu index="1">
                        <template #title>
                            <el-icon>
                                <Connection />
                            </el-icon>
                            <span>资源库管理</span>
                        </template>
                        <el-menu-item index="1-1">场景库</el-menu-item>
                        <el-menu-item index="1-2">目标库</el-menu-item>
                        <el-menu-item index="1-3">工具库</el-menu-item>
                        <el-menu-item index="1-4">典型装备库</el-menu-item>
                    </el-sub-menu>
                </el-menu>
            </el-aside>

            <!-- 右侧内容区 -->
            <el-main class="content-area">
                <!-- 场景库：用于加载场景 -->
                <div v-if="activeMenuItem === '1-1'" class="content-box">
                    <SceneList />
                </div>

                <!-- 目标库：路由器、虚拟机 -->
                <div v-else-if="activeMenuItem === '1-2'" class="content-box">
                    <div class="library-container">
                        <!-- 搜索和操作区域 -->
                    <div class="action-header">
                        <el-button type="primary" @click="openAddDialog('target')">添加节点</el-button>
                        <el-button type="danger" :disabled="!selectedTargetNodes.length" @click="handleBatchDelete('target')">批量删除</el-button>
                        <el-button @click="refreshData" :loading="refreshing">刷新</el-button>

                        <el-form :inline="true" :model="targetQuery" class="search-form">
                            <el-form-item label="节点名称">
                                <el-input v-model="targetQuery.name" placeholder="输入节点名称" clearable />
                            </el-form-item>
                            <el-form-item label="节点类型">
                                <el-select v-model="targetQuery.type" placeholder="选择类型" clearable>
                                    <el-option label="路由器" value="ROUTER" />
                                    <el-option label="虚拟机" value="VMNODE" />
                                </el-select>
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" @click="handleQuery('target')">查询</el-button>
                                <el-button @click="resetQuery('target')">重置</el-button>
                            </el-form-item>
                        </el-form>
                    </div>

                    <!-- 数据表格 -->
                    <el-table
                        :data="filteredTargetNodes"
                        stripe
                        border
                        style="width: 100%"
                        height="calc(100vh - 400px)"
                        @selection-change="handleTargetSelectionChange"
                        empty-text="当前场景暂无此类节点">
                        <el-table-column type="selection" width="50" align="center" />
                        <el-table-column prop="alias" label="名称" min-width="150" align="center" show-overflow-tooltip>
                            <template #default="scope">
                                {{ scope.row.alias || scope.row.name }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="type" label="类型" min-width="120" align="center">
                            <template #default="scope">
                                <el-tag :type="getNodeTypeColor(scope.row.type)">{{ displayType(scope.row) }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="坐标" min-width="200" align="center">
                            <template #default="scope">
                                经度: {{ scope.row.geo?.lon ?? '-' }}，纬度: {{ scope.row.geo?.lat ?? '-' }}，高度: {{ scope.row.geo?.alt ?? '-' }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="status" label="状态" min-width="80" align="center">
                            <template #default="scope">
                                <el-tag :type="scope.row.status === 'UP' ? 'success' : 'danger'">{{ scope.row.status || 'UP' }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" min-width="120" align="center">
                            <template #default="scope">
                                <div class="action-buttons">
                                    <el-popconfirm title="确认删除该节点？" @confirm="deleteNode(scope.row)">
                                        <template #reference>
                                            <el-button size="small" type="danger">删除</el-button>
                                        </template>
                                    </el-popconfirm>
                                </div>
                            </template>
                        </el-table-column>
                    </el-table>
                    </div>
                </div>

                <!-- 工具库：SDN控制器、Ovs交换机、流量终端、业务终端、子网、半实物、应用层模型 -->
                <div v-else-if="activeMenuItem === '1-3'" class="content-box">
                    <div class="library-container">
                        <!-- 搜索和操作区域 -->
                        <div class="action-header">
                        <el-button type="primary" @click="openAddDialog('tools')">添加节点</el-button>
                        <el-button type="danger" :disabled="!selectedToolNodes.length" @click="handleBatchDelete('tools')">批量删除</el-button>
                        <el-button @click="refreshData" :loading="refreshing">刷新</el-button>

                        <el-form :inline="true" :model="toolQuery" class="search-form">
                            <el-form-item label="节点名称">
                                <el-input v-model="toolQuery.name" placeholder="输入节点名称" clearable />
                            </el-form-item>
                            <el-form-item label="节点类型">
                                <el-select v-model="toolQuery.type" placeholder="选择类型" clearable>
                                    <el-option label="SDN控制器" value="SDN_CONTROLLER" />
                                    <el-option label="Ovs交换机" value="Ovs_SWITCH" />
                                    <el-option label="流量终端" value="TMV" />
                                    <el-option label="业务终端" value="BUSINESS_Transmitter" />
                                    <el-option label="子网" value="EMANE" />
                                    <el-option label="半实物" value="RJ45" />
                                </el-select>
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" @click="handleQuery('tools')">查询</el-button>
                                <el-button @click="resetQuery('tools')">重置</el-button>
                            </el-form-item>
                        </el-form>
                    </div>

                    <!-- 数据表格 -->
                    <el-table
                        :data="filteredToolNodes"
                        stripe
                        border
                        style="width: 100%"
                        height="calc(100vh - 400px)"
                        @selection-change="handleToolSelectionChange"
                        empty-text="当前场景暂无此类节点">
                        <el-table-column type="selection" width="50" align="center" />
                        <el-table-column prop="alias" label="名称" min-width="180" align="center" show-overflow-tooltip>
                            <template #default="scope">
                                {{ scope.row.alias || scope.row.name }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="type" label="类别" min-width="150" align="center">
                            <template #default="scope">
                                <el-tag :type="getNodeTypeColor(scope.row.type)">{{ classifyTool(scope.row) }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="坐标" min-width="200" align="center">
                            <template #default="scope">
                                经度: {{ scope.row.geo?.lon ?? '-' }}，纬度: {{ scope.row.geo?.lat ?? '-' }}，高度: {{ scope.row.geo?.alt ?? '-' }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="status" label="状态" min-width="80" align="center">
                            <template #default="scope">
                                <el-tag :type="scope.row.status === 'UP' ? 'success' : 'danger'">{{ scope.row.status || 'UP' }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" min-width="120" align="center">
                            <template #default="scope">
                                <div class="action-buttons">
                                    <el-popconfirm title="确认删除该节点？" @confirm="deleteNode(scope.row)">
                                        <template #reference>
                                            <el-button size="small" type="danger">删除</el-button>
                                        </template>
                                    </el-popconfirm>
                                </div>
                            </template>
                        </el-table-column>
                    </el-table>
                    </div>
                </div>

                <!-- 典型装备库：无人机、基站、交换机、攻击机、安全机、干扰 -->
                <div v-else-if="activeMenuItem === '1-4'" class="content-box">
                    <div class="library-container">
                        <!-- 搜索和操作区域 -->
                        <div class="action-header">
                        <el-button type="primary" @click="openAddDialog('equipment')">添加节点</el-button>
                        <el-button type="danger" :disabled="!selectedEquipmentNodes.length" @click="handleBatchDelete('equipment')">批量删除</el-button>
                        <el-button @click="refreshData" :loading="refreshing">刷新</el-button>

                        <el-form :inline="true" :model="equipmentQuery" class="search-form">
                            <el-form-item label="节点名称">
                                <el-input v-model="equipmentQuery.name" placeholder="输入节点名称" clearable />
                            </el-form-item>
                            <el-form-item label="节点类型">
                                <el-select v-model="equipmentQuery.type" placeholder="选择类型" clearable>
                                    <el-option label="无人机" value="DRONE" />
                                    <el-option label="基站" value="BASESTATION" />
                                    <el-option label="交换机" value="SWITCH" />
                                    <el-option label="攻击机" value="ATTACK_MACHINE" />
                                    <el-option label="安全机" value="SECURITY_MACHINE" />
                                    <el-option label="干扰" value="INODE" />
                                </el-select>
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" @click="handleQuery('equipment')">查询</el-button>
                                <el-button @click="resetQuery('equipment')">重置</el-button>
                            </el-form-item>
                        </el-form>
                    </div>

                    <!-- 数据表格 -->
                    <el-table
                        :data="filteredEquipmentNodes"
                        stripe
                        border
                        style="width: 100%"
                        height="calc(100vh - 400px)"
                        @selection-change="handleEquipmentSelectionChange"
                        empty-text="当前场景暂无此类节点">
                        <el-table-column type="selection" width="50" align="center" />
                        <el-table-column prop="alias" label="名称" min-width="180" align="center" show-overflow-tooltip>
                            <template #default="scope">
                                {{ scope.row.alias || scope.row.name }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="type" label="类型" min-width="120" align="center">
                            <template #default="scope">
                                <el-tag :type="getNodeTypeColor(scope.row.type)">{{ displayType(scope.row) }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="坐标" min-width="200" align="center">
                            <template #default="scope">
                                经度: {{ scope.row.geo?.lon ?? '-' }}，纬度: {{ scope.row.geo?.lat ?? '-' }}，高度: {{ scope.row.geo?.alt ?? '-' }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="status" label="状态" min-width="80" align="center">
                            <template #default="scope">
                                <el-tag :type="scope.row.status === 'UP' ? 'success' : 'danger'">{{ scope.row.status || 'UP' }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" min-width="120" align="center">
                            <template #default="scope">
                                <div class="action-buttons">
                                    <el-popconfirm title="确认删除该节点？" @confirm="deleteNode(scope.row)">
                                        <template #reference>
                                            <el-button size="small" type="danger">删除</el-button>
                                        </template>
                                    </el-popconfirm>
                                </div>
                            </template>
                        </el-table-column>
                    </el-table>
                    </div>
                </div>

                <!-- 通用添加对话框（手动输入坐标） -->
                <el-dialog v-model="addDialog.visible" title="添加节点" width="520px">
                    <el-form label-width="90px" :model="addDialog.form">
                        <el-form-item label="库类型">
                            <el-select v-model="addDialog.category" placeholder="请选择库">
                                <el-option label="目标库" value="target" />
                                <el-option label="工具库" value="tools" />
                                <el-option label="典型装备库" value="equipment" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="节点类型">
                            <el-select v-model="addDialog.form.type" placeholder="请选择类型">
                                <el-option v-for="opt in addTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="节点名称">
                            <el-input v-model="addDialog.form.name" placeholder="可留空自动命名" />
                        </el-form-item>
                        <el-form-item label="经度">
                            <el-input v-model.number="addDialog.form.lon" type="number" />
                        </el-form-item>
                        <el-form-item label="纬度">
                            <el-input v-model.number="addDialog.form.lat" type="number" />
                        </el-form-item>
                        <el-form-item label="高度">
                            <el-input v-model.number="addDialog.form.alt" type="number" />
                        </el-form-item>
                    </el-form>
                    <template #footer>
                        <el-button @click="addDialog.visible=false">取消</el-button>
                        <el-button type="primary" @click="confirmAdd">确定</el-button>
                    </template>
                </el-dialog>

                <!-- 复用已有节点配置对话框（用于VM/子网/干扰的细化配置） -->
                <NodeConfigDialog :visible="vmDialog.visible" :position="vmDialog.position" nodeType="VMNODE" @update:visible="vmDialog.visible=$event" @confirm="handleNodeCreated" />
                <SubnetConfigDialog :visible="subnetDialog.visible" :position="subnetDialog.position" @update:visible="subnetDialog.visible=$event" @confirm="handleNodeCreated" />
                <InterferenceNodeConfigDialog :visible="interDialog.visible" :position="interDialog.position" @update:visible="interDialog.visible=$event" @confirm="handleNodeCreated" />
            </el-main>
        </el-container>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Connection } from '@element-plus/icons-vue';
import SceneList from '../../components/SceneList.vue';
import { useTopoStore } from '../../store/modules/topo';
import NodeConfigDialog from '../cesium/components/NodeConfigDialog.vue';
import SubnetConfigDialog from '../cesium/components/SubnetConfigDialog.vue';
import InterferenceNodeConfigDialog from '../cesium/components/InterferenceNodeConfigDialog.vue';
import websocketService from '../../services/websocket';
import { getUserInfo } from '../../store/user';

const topoStore = useTopoStore();

const activeMenuItem = ref('1-1');
const refreshing = ref(false);

const handleMenuSelect = (index: string) => {
  activeMenuItem.value = index;
};

// 查询表单
const targetQuery = ref({ name: '', type: '' });
const toolQuery = ref({ name: '', type: '' });
const equipmentQuery = ref({ name: '', type: '' });

// 选择状态
const selectedTargetNodes = ref<any[]>([]);
const selectedToolNodes = ref<any[]>([]);
const selectedEquipmentNodes = ref<any[]>([]);

// 库内类型选项
const targetTypeOptions = [
  { label: '路由器', value: 'ROUTER' },
  { label: '虚拟机', value: 'VMNODE' },
];
const toolTypeOptions = [
  { label: 'SDN控制器', value: 'SDN_CONTROLLER' },
  { label: 'Ovs交换机', value: 'Ovs_SWITCH' },
  { label: '流量终端', value: 'TMV' },
  { label: '业务终端', value: 'BUSINESS_Transmitter' },
  { label: '子网', value: 'EMANE' },
  { label: '半实物', value: 'RJ45' },
  // 应用层模型
  { label: 'HTTP', value: 'HTTP' },
  { label: 'HTTPS', value: 'HTTPS' },
  { label: 'FTP', value: 'FTP' },
  { label: 'DNS', value: 'DNS' },
  { label: 'SMTP', value: 'SMTP' },
  { label: 'VoIP-SIP', value: 'VoIP-SIP' },
  { label: 'RTSP-RTP', value: 'RTSP-RTP' },
];
const equipmentTypeOptions = [
  { label: '无人机', value: 'DRONE' },
  { label: '基站', value: 'BASESTATION' },
  { label: '交换机', value: 'SWITCH' },
  { label: '攻击机', value: 'ATTACK_MACHINE' },
  { label: '安全机', value: 'SECURITY_MACHINE' },
  { label: '干扰', value: 'INODE' },
];

const addDialog = ref({
  visible: false,
  category: 'target' as 'target' | 'tools' | 'equipment',
  form: {
    type: '' as string,
    name: '' as string,
    lon: 0,
    lat: 0,
    alt: 0,
  }
});

const vmDialog = ref({ visible: false, position: { lat: 0, lon: 0, alt: 0 } });
const subnetDialog = ref({ visible: false, position: { lat: 0, lon: 0, alt: 0 } });
const interDialog = ref({ visible: false, position: { lat: 0, lon: 0, alt: 0 } });

const addTypeOptions = computed(() => {
  if (addDialog.value.category === 'target') return targetTypeOptions;
  if (addDialog.value.category === 'tools') return toolTypeOptions;
  return equipmentTypeOptions;
});

// 节点分类展示
const appImageMap: Record<string, string> = {
  'http:v1': 'HTTP',
  'https:v1': 'HTTPS',
  'ftp:v1': 'FTP',
  'dns:v1': 'DNS',
  'smtp:v1': 'SMTP',
  'voip:v1': 'VoIP-SIP',
  'rtsp:v1': 'RTSP-RTP',
  'data:v1': '业务终端',
  'tmv:v1': '流量终端',
  'sdn:v1.1': 'SDN/OVS',
  'attack:v2.3': '攻击/安全机',
  'nest:v2': '路由器',
};

const allNodes = computed(() => topoStore.topoData?.nodes || []);

// 基础节点分类
const targetNodes = computed(() => allNodes.value.filter((n: any) =>
  n.type === 'ROUTER' || n.type === 'DOCKER' && n.image === 'nest:v3' || n.type === 'VMNODE' || n.type === 'SERVER'
));
const toolNodes = computed(() => allNodes.value.filter((n: any) => {
  if (n.type === 'EMANE' || n.type === 'RJ45' || n.type === 'TMV' || n.type === 'BUSINESS_Transmitter') return true;
  if (n.type === 'DOCKER' && n.image && appImageMap[n.image]) return true;
  return false;
}));
const equipmentNodes = computed(() => allNodes.value.filter((n: any) => {
  if (n.type === 'DRONE' || n.type === 'BASESTATION' || n.type === 'SWITCH' || n.type === 'INODE') return true;
  if (n.type === 'DOCKER' && (n.image === 'attack:v2.3')) return true;
  return false;
}));

// 过滤后的节点（支持搜索）
const filteredTargetNodes = computed(() => {
  let nodes = targetNodes.value;
  if (targetQuery.value.name) {
    nodes = nodes.filter(n =>
      (n.alias?.toLowerCase() || n.name?.toLowerCase() || '').includes(targetQuery.value.name.toLowerCase())
    );
  }
  if (targetQuery.value.type) {
    nodes = nodes.filter(n => {
      if (targetQuery.value.type === 'ROUTER') return n.type === 'ROUTER' || (n.type === 'DOCKER' && n.image === 'nest:v3');
      if (targetQuery.value.type === 'VMNODE') return n.type === 'VMNODE' || n.type === 'SERVER';
      return false;
    });
  }
  return nodes;
});

const filteredToolNodes = computed(() => {
  let nodes = toolNodes.value;
  if (toolQuery.value.name) {
    nodes = nodes.filter(n =>
      (n.alias?.toLowerCase() || n.name?.toLowerCase() || '').includes(toolQuery.value.name.toLowerCase())
    );
  }
  if (toolQuery.value.type) {
    nodes = nodes.filter(n => n.type === toolQuery.value.type || (n.type === 'DOCKER' && n.image?.includes(toolQuery.value.type.toLowerCase())));
  }
  return nodes;
});

const filteredEquipmentNodes = computed(() => {
  let nodes = equipmentNodes.value;
  if (equipmentQuery.value.name) {
    nodes = nodes.filter(n =>
      (n.alias?.toLowerCase() || n.name?.toLowerCase() || '').includes(equipmentQuery.value.name.toLowerCase())
    );
  }
  if (equipmentQuery.value.type) {
    nodes = nodes.filter(n => n.type === equipmentQuery.value.type);
  }
  return nodes;
});

function displayType(node: any) {
  if (node.type === 'DOCKER' && node.image) {
    return appImageMap[node.image] || 'Docker';
  }
  const typeMap: Record<string, string> = {
    VMNODE: '虚拟机', SERVER: '虚拟机', ROUTER: '路由器', SWITCH: '交换机', DRONE: '无人机', BASESTATION: '基站', INODE: '干扰', EMANE: '子网', RJ45: '半实物'
  };
  return typeMap[node.type] || node.type;
}
function classifyTool(node: any) {
  if (node.type === 'EMANE') return '子网';
  if (node.type === 'RJ45') return '半实物';
  if (node.type === 'TMV') return '流量终端';
  if (node.type === 'BUSINESS_Transmitter') return '业务终端';
  if (node.type === 'DOCKER' && node.image) return appImageMap[node.image] || 'Docker';
  return node.type;
}

// 节点类型颜色映射
function getNodeTypeColor(type: string) {
  const colorMap: Record<string, string> = {
    'ROUTER': 'primary',
    'VMNODE': 'success',
    'SERVER': 'success',
    'DOCKER': 'info',
    'EMANE': 'warning',
    'RJ45': 'danger',
    'DRONE': 'primary',
    'BASESTATION': 'success',
    'SWITCH': 'info',
    'INODE': 'danger'
  };
  return colorMap[type] || 'info';
}

// 选择变化处理
function handleTargetSelectionChange(selection: any[]) {
  selectedTargetNodes.value = selection;
}
function handleToolSelectionChange(selection: any[]) {
  selectedToolNodes.value = selection;
}
function handleEquipmentSelectionChange(selection: any[]) {
  selectedEquipmentNodes.value = selection;
}

// 查询处理
function handleQuery(category: 'target' | 'tools' | 'equipment') {
  // 查询逻辑已在computed中实现，这里可以添加额外的处理
}

function resetQuery(category: 'target' | 'tools' | 'equipment') {
  if (category === 'target') {
    targetQuery.value = { name: '', type: '' };
  } else if (category === 'tools') {
    toolQuery.value = { name: '', type: '' };
  } else if (category === 'equipment') {
    equipmentQuery.value = { name: '', type: '' };
  }
}

// 批量删除
async function handleBatchDelete(category: 'target' | 'tools' | 'equipment') {
  let selectedNodes: any[] = [];
  let categoryName = '';

  if (category === 'target') {
    selectedNodes = selectedTargetNodes.value;
    categoryName = '目标库';
  } else if (category === 'tools') {
    selectedNodes = selectedToolNodes.value;
    categoryName = '工具库';
  } else if (category === 'equipment') {
    selectedNodes = selectedEquipmentNodes.value;
    categoryName = '典型装备库';
  }

  if (selectedNodes.length === 0) {
    ElMessage.warning('请至少选择一个节点');
    return;
  }

  const names = selectedNodes.map(node => node.alias || node.name).join('、');
  try {
    await ElMessageBox.confirm(`确定要删除${categoryName}中的以下节点吗？<br/>${names}`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      dangerouslyUseHTMLString: true,
    });

    // 批量删除节点
    for (const node of selectedNodes) {
      await (topoStore as any).removeNodeRemote(node.id);
    }

    ElMessage.success(`已删除${selectedNodes.length}个节点`);

    // 发送跨页面同步消息
    await nextTick();
    sendTopoSyncMessage();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error);
      ElMessage.error('批量删除失败');
    }
  }
}

function openAddDialog(category: 'target' | 'tools' | 'equipment') {
  addDialog.value.category = category;
  addDialog.value.form = { type: '', name: '', lon: 0, lat: 0, alt: 0 };
  addDialog.value.visible = true;
}

// 刷新数据（重新从后端获取最新拓扑）
async function refreshData() {
  if (!topoStore.currentSessionId) {
    ElMessage.warning('请先加载场景');
    return;
  }
  try {
    refreshing.value = true;
    const { getTopoBySession } = await import('../../api/scene');
    const result = await getTopoBySession(topoStore.currentSessionId);
    if (result?.data) {
      (topoStore as any).setTopoData(topoStore.currentSessionId, result.data);
      ElMessage.success('数据已刷新');
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '刷新失败');
  } finally {
    refreshing.value = false;
  }
}

function genRJ45Name() {
  const existing = (topoStore.topoData?.nodes || []).filter((n: any) => n.type === 'RJ45' || (typeof n.name === 'string' && n.name.startsWith('ens52f0')));
  if (existing.length === 0) return 'ens52f0';
  return `ens52f0_${existing.length + 1}`;
}
function genDefaultName(type: string) {
  const label = displayType({ type });
  const count = (topoStore.topoData?.nodes || []).filter((n: any) => n.type === type || n.name?.startsWith(label)).length;
  return `${label}${count + 1}`;
}

// 生成安全的节点ID（避免过大导致后端报错）
function getNextNodeId() {
  const existingIds = (topoStore.topoData?.nodes || []).map((n: any) => n.id).filter((id: any) => typeof id === 'number');
  if (existingIds.length === 0) return 1;
  return Math.max(...existingIds) + 1;
}

async function confirmAdd() {
  try {
    const { type, name, lon, lat, alt } = addDialog.value.form;
    if (!type) { ElMessage.warning('请选择节点类型'); return; }
    const position = { lon: Number(lon||0), lat: Number(lat||0), alt: Number(alt||0) };

    // 交给各自配置弹窗（以复用现有逻辑）
    if (type === 'VMNODE') {
      vmDialog.value.position = { lat: position.lat, lon: position.lon, alt: position.alt };
      vmDialog.value.visible = true;
      addDialog.value.visible = false;
      return;
    }
    if (type === 'EMANE') {
      subnetDialog.value.position = { lat: position.lat, lon: position.lon, alt: position.alt };
      subnetDialog.value.visible = true;
      addDialog.value.visible = false;
      return;
    }
    if (type === 'INODE') {
      interDialog.value.position = { lat: position.lat, lon: position.lon, alt: position.alt };
      interDialog.value.visible = true;
      addDialog.value.visible = false;
      return;
    }

    // 直接走通用新增
    const nodeId = getNextNodeId();
    const nodeData: any = {
      id: nodeId,
      name: name?.trim() || (type === 'RJ45' ? genRJ45Name() : genDefaultName(type)),
      type,
      geo: position,
      role: 2,
      status: 'UP',
      alias: name?.trim() || ''
    };

    // 类型到具体后端形态映射
    const setDocker = (img: string) => { nodeData.type = 'DOCKER'; nodeData.image = img; };
    switch (type) {
      case 'ROUTER': setDocker('nest:v3'); break;
      case 'ATTACK_MACHINE': setDocker('attack:v2.3'); break;
      case 'SECURITY_MACHINE': setDocker('attack:v2.3'); break;
      case 'SDN_CONTROLLER': setDocker('sdn:v1.1'); break;
      case 'Ovs_SWITCH': setDocker('sdn:v1.1'); break;
      case 'BUSINESS_Transmitter': setDocker('data:v1'); break;
      case 'HTTP': setDocker('http:v1'); break;
      case 'HTTPS': setDocker('https:v1'); break;
      case 'FTP': setDocker('ftp:v1'); break;
      case 'DNS': setDocker('dns:v1'); break;
      case 'SMTP': setDocker('smtp:v1'); break;
      case 'VoIP-SIP': setDocker('voip:v1'); break;
      case 'RTSP-RTP': setDocker('rtsp:v1'); break;
      case 'DRONE': nodeData.model = 'prouter'; break;
      // VMNODE/EMANE/INODE 已在上方分支处理
    }

    await (topoStore as any).addNodeRemote(nodeData);
    ElMessage.success('添加成功');
    addDialog.value.visible = false;

    // 通过WebSocket通知其他页面（包括Cesium页面）同步拓扑数据
    await nextTick();
    sendTopoSyncMessage();
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败');
  }
}

// 发送拓扑同步WebSocket消息和localStorage事件
function sendTopoSyncMessage() {
  if (!topoStore.currentSessionId) return;

  const userInfo = getUserInfo();
  const syncMessage = {
    action: 11, // 拓扑同步消息
    sessionId: topoStore.currentSessionId,
    senderId: userInfo.id,
    extand: "CROSS_PAGE_SYNC", // 标识这是跨页面同步消息
    source: "srclibrary" // 标识消息来源
  };

  // 方案1: 通过WebSocket发送消息
  if (websocketService.connected) {
    websocketService.send(syncMessage);
  } else {
    console.warn('WebSocket未连接，无法发送同步消息');
  }

  // 方案2: 通过localStorage事件实现跨页面通信（备用方案）
  const storageEvent = {
    type: 'TOPO_SYNC',
    sessionId: topoStore.currentSessionId,
    timestamp: Date.now(),
    source: 'srclibrary'
  };
  localStorage.setItem('topoSyncEvent', JSON.stringify(storageEvent));
}

async function deleteNode(row: any) {
  try {
    await (topoStore as any).removeNodeRemote(row.id);
    ElMessage.success('已删除');

    // 通过WebSocket通知其他页面（包括Cesium页面）同步拓扑数据
    await nextTick();
    sendTopoSyncMessage();
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败');
  }
}

// 处理节点创建完成事件（来自对话框组件）
async function handleNodeCreated(nodeData: any) {

  // 发送跨页面同步消息
  await nextTick();
  sendTopoSyncMessage();
}

// 处理拓扑同步WebSocket消息 (action=11) - 资源库页面版本
const handleTopoSyncMessage = async (data: any) => {
  try {

    // 验证消息格式
    if (!data.sessionId) {
      console.warn("拓扑同步消息缺少sessionId");
      return;
    }

    // 检查是否是当前会话的消息
    if (topoStore.currentSessionId && data.sessionId !== topoStore.currentSessionId) {
      return;
    }

    // 检查senderId，避免处理自己发送的消息（除非是跨页面同步）
    if (data.senderId && data.extand !== "CROSS_PAGE_SYNC") {
      const userInfo = getUserInfo();
      const currentUserId = userInfo.id;

      if (data.senderId === currentUserId) {
        return;
      }
    }

    // 如果是来自Cesium页面的跨页面同步消息，则刷新数据
    if (data.extand === "CROSS_PAGE_SYNC" && data.source === "cesium") {
      await refreshData();
    } else if (data.senderId !== getUserInfo().id) {
      // 来自其他用户的消息，也需要刷新
      await refreshData();
    }

  } catch (error) {
    console.error("资源库页面处理拓扑同步WebSocket消息出错:", error);
  }
};

// localStorage事件处理器（跨页面通信）- 资源库页面版本
const handleStorageChange = async (event: StorageEvent) => {
  if (event.key === 'topoSyncEvent' && event.newValue) {
    try {
      const syncEvent = JSON.parse(event.newValue);

      if (syncEvent.type === 'TOPO_SYNC' &&
          syncEvent.sessionId === topoStore.currentSessionId &&
          syncEvent.source === 'cesium') {
        await refreshData();
      }
    } catch (error) {
      console.error('资源库页面处理localStorage同步事件出错:', error);
    }
  }
};

// 确保WebSocket连接在资源库页面也是活跃的
onMounted(() => {
  // 设置拓扑存储获取器
  websocketService.setTopoStoreGetter(() => topoStore);

  // 确保WebSocket连接
  if (!websocketService.connected) {
    websocketService.connect();
  }

  // 注册WebSocket消息处理器
  websocketService.onMessage('action_11', handleTopoSyncMessage);

  // 添加localStorage事件监听器（跨页面通信）
  window.addEventListener('storage', handleStorageChange);
});

onUnmounted(() => {
  // 移除WebSocket消息处理器
  websocketService.offMessage('action_11', handleTopoSyncMessage);

  // 移除localStorage事件监听器
  window.removeEventListener('storage', handleStorageChange);

  // 页面卸载时不需要断开WebSocket，因为其他页面可能还在使用
});
</script>

<style scoped lang="scss">
.network-container {
    height: 100%;
    display: flex;
    flex-direction: column;

    .content-box {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    // 库容器样式，与SceneList保持一致
    .library-container {
        background-color: #ffffff;
        border-radius: 4px;
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
        padding: 20px;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    // 参考场景库的样式设计
    .action-header {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 12px;
    }

    .action-header .el-button {
        height: 32px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .search-form {
        display: flex;
        align-items: center;
        margin-left: 8px;
    }

    .el-form--inline .el-form-item {
        margin-right: 16px;
        margin-bottom: 0;
    }

    :deep(.el-input__wrapper) {
        height: 32px;
        line-height: 32px;
    }

    :deep(.el-form-item__label) {
        line-height: 32px;
    }

    // 表格样式调整
    :deep(.el-table) {
        font-size: 14px;
    }

    :deep(.el-table th) {
        background-color: #f5f7fa;
        color: #606266;
        font-weight: bold;
        text-align: center;
    }

    :deep(.el-table td) {
        padding: 8px 0;
    }

    :deep(.el-button--small) {
        padding: 6px 10px;
        margin: 0 3px;
    }

    // 按钮间距控制
    :deep(.el-table .cell) {
        white-space: nowrap;
    }

    // 操作按钮组样式
    .action-buttons {
        display: flex;
        justify-content: center;
        flex-wrap: nowrap;
        gap: 5px;
    }

    // 改善对话框字体
    :deep(.el-dialog) {
        .el-dialog__title {
            font-size: 16px;
            font-weight: 600;
        }

        .el-form-item__label {
            font-size: 14px;
        }

        .el-input__inner {
            font-size: 14px;
        }

        .el-select .el-input__inner {
            font-size: 14px;
        }
    }
    display: flex;

    .el-container {
        width: 100%;
        height: 100%;
    }

    .side-menu {
        height: 100%;
        border-right: 1px solid #e6e6e6;
        background-color: #fff;
        transition: width 0.3s;
    }

    .content-area {
        background-color: #f5f7fa;
        padding: 20px;
        overflow: auto;
    }

    .content-box {
        height: calc(100% - 40px);

        h3 {
            margin-top: 0;
            margin-bottom: 20px;
        }
    }

    @media screen and (max-width: 768px) {
        .pagination-container {
            overflow-x: auto;
            padding-bottom: 10px;
        }
    }
}
</style>