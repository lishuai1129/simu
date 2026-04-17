<template>
    <div class="system-container">
        <el-container>
            <!-- 左侧侧边栏 -->
            <el-aside width="220px" class="side-menu">
                <el-menu :default-active="activeMenuItem" class="vertical-menu" @select="handleMenuSelect">
                    <el-sub-menu index="1">
                        <template #title>
                            <el-icon>
                                <Setting />
                            </el-icon>
                            <span>系统管理</span>
                        </template>
                        <el-menu-item index="1-1">用户管理</el-menu-item>
                        <el-menu-item index="1-2">系统日志</el-menu-item>
                    </el-sub-menu>
                </el-menu>
            </el-aside>

            <!-- 右侧内容区 -->
            <el-main class="content-area">
                <div v-if="activeMenuItem === '1-1'">
                    <el-alert
                        v-if="!isAdmin"
                        type="warning"
                        description="普通用户无法进行用户管理操作。"
                        show-icon
                        :closable="false"
                        style="margin-bottom: 15px;"
                    />
                    <el-card class="user-management-card">
                        <div class="card-header">
                            <el-button type="primary" @click="refreshUserList">刷新用户列表</el-button>
                        </div>
                        <el-table
                            v-loading="tableLoading"
                            :data="userList"
                            stripe
                            border
                            style="width: 100%"
                        >
                            <el-table-column prop="id" label="用户ID" width="400" />
                            <el-table-column prop="username" label="用户名" width="200" />
                            <el-table-column label="用户类型" width="280">
                                <template #default="scope">
                                    <el-tag 
                                        :type="getUserTypeTagType(scope.row.type)" 
                                        :effect="scope.row.type === 1 ? 'dark' : 'plain'"
                                    >
                                        {{ getUserTypeName(scope.row.type) }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column label="角色" width="280">
                                <template #default="scope">
                                    <el-tag 
                                        :type="getRoleTagType(scope.row.role)" 
                                        :effect="'plain'"
                                    >
                                        {{ getRoleName(scope.row.role) }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column label="操作">
                                <template #default="scope">
                                    <el-button 
                                        v-if="isAdmin"
                                        type="primary" 
                                        size="small" 
                                        @click="handleAssignRole(scope.row)"
                                    >
                                        分配角色
                                    </el-button>
                                    <el-button 
                                        v-if="isAdmin"
                                        type="danger" 
                                        size="small" 
                                        @click="handleDeleteUser(scope.row)"
                                    >
                                        删除
                                    </el-button>
                                    <span v-if="!isAdmin">无操作权限</span>
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-card>
                </div>
                <div v-else-if="activeMenuItem === '1-2'" class="system-logs">

                    <!-- 日志操作栏 -->
                    <div class="log-operations">
                        <el-form :inline="true" class="filter-form">
                            <el-form-item label="日志来源">
                                <el-radio-group v-model="logSource">
                                    <el-radio-button label="local">本地</el-radio-button>
                                    <el-radio-button label="backend">后端</el-radio-button>
                                </el-radio-group>
                            </el-form-item>
                            <el-form-item label="场景ID" v-if="logSource === 'backend'">
                                <el-input
                                    v-model="sessionIdInput"
                                    placeholder="输入场景ID"
                                    style="width: 150px"
                                    clearable
                                />
                            </el-form-item>
                            <el-form-item label="日志类型">
                                <el-select v-model="logTypeFilter" placeholder="选择日志类型">
                                    <el-option label="全部" value="all"></el-option>
                                    <el-option label="普通" value="normal"></el-option>
                                    <el-option label="警告" value="warning"></el-option>
                                    <el-option label="重要" value="important"></el-option>
                                </el-select>
                            </el-form-item>
                            <el-form-item label="模块">
                                <el-select v-model="moduleFilter" placeholder="选择模块">
                                    <el-option label="全部" value="all"></el-option>
                                    <el-option label="用户认证" value="auth"></el-option>
                                    <el-option label="场景管理" value="scene"></el-option>
                                    <el-option label="节点管理" value="node"></el-option>
                                    <el-option label="链路管理" value="link"></el-option>
                                    <el-option label="子网管理" value="subnet"></el-option>
                                    <el-option label="仿真控制" value="simulation"></el-option>
                                    <el-option label="无人机" value="drone"></el-option>
                                    <el-option label="地图" value="map"></el-option>
                                    <el-option label="用户管理" value="用户管理"></el-option>
                                    <el-option label="用户界面" value="ui"></el-option>
                                    <el-option label="应用层模型" value="application"></el-option>
                                    <el-option label="WebSocket" value="websocket"></el-option>
                                    <el-option label="API请求" value="api"></el-option>
                                    <el-option label="文件操作" value="file"></el-option>
                                    <el-option label="快照管理" value="snapshot"></el-option>
                                    <el-option label="录制记录" value="record"></el-option>
                                </el-select>
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" @click="applyFilters">筛选</el-button>
                                <el-button @click="resetFilters">重置</el-button>
                                <el-button
                                    v-if="logSource === 'backend'"
                                    type="success"
                                    @click="fetchBackendLogs"
                                    :loading="backendLoading"
                                >
                                    获取后端日志
                                </el-button>
                            </el-form-item>
                        </el-form>

                        <div class="right-operations">
                            <el-button type="danger" @click="confirmClearLogs">清空本地日志</el-button>
                            <el-button type="success" @click="exportLogs">导出日志</el-button>
                        </div>
                    </div>
                    
                    <!-- 当前场景信息 -->
                    <div v-if="logSource === 'backend'" class="session-info">
                        <el-alert
                            :title="`当前场景ID: ${currentSessionId || '未加载场景'}`"
                            type="info"
                            show-icon
                            :closable="false"
                        />
                    </div>

                    <!-- 日志表格 -->
                    <el-table
                        :data="filteredLogsList"
                        style="width: 100%"
                        border
                        stripe
                        v-loading="loading || backendLoading"
                        height="calc(100vh - 280px)"
                        empty-text="暂无日志数据"
                    >
                        <el-table-column prop="id" label="ID" width="80" />
                        <el-table-column label="场景ID" width="120">
                            <template #default="scope">
                                {{ scope.row.sessionId || '-' }}
                            </template>
                        </el-table-column>
                        <el-table-column label="时间" width="180">
                            <template #default="scope">
                                {{ formatTime(scope.row.time) }}
                            </template>
                        </el-table-column>
                        <el-table-column label="类型" width="100">
                            <template #default="scope">
                                <el-tag
                                    :type="getTagType(scope.row.type)"
                                    effect="dark"
                                    size="small"
                                >
                                    {{ getLogTypeLabel(scope.row.type) }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column prop="module" label="模块" width="120" />
                        <el-table-column prop="action" label="操作" width="150" />
                        <el-table-column label="信息" show-overflow-tooltip>
                            <template #default="scope">
                                {{ scope.row.information || '-' }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="details" label="详情" show-overflow-tooltip />
                        <el-table-column fixed="right" label="操作" width="100">
                            <template #default="scope">
                                <el-button link type="primary" size="small" @click="showLogDetail(scope.row)">
                                    详情
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </el-main>
        </el-container>
        
        <!-- 分配角色对话框 -->
        <el-dialog v-model="roleDialogVisible" title="分配角色" width="500px">
            <div v-if="currentUser" class="role-assignment">
                <p><strong>用户名:</strong> {{ currentUser.username }}</p>
                <p><strong>当前角色:</strong> {{ getRoleName(currentUser.role) }}</p>
                
                <div class="role-selection">
                    <p><strong>选择角色:</strong></p>
                    <el-radio-group v-model="selectedRole">
                        <el-radio :label="1">
                            <el-tag type="info" effect="plain">白方</el-tag>
                        </el-radio>
                        <el-radio :label="2">
                            <el-tag type="warning" effect="plain">红方</el-tag>
                        </el-radio>
                        <el-radio :label="3">
                            <el-tag type="danger" effect="plain">蓝方</el-tag>
                        </el-radio>
                    </el-radio-group>
                </div>
            </div>
            
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="roleDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="confirmAssignRole" :loading="assignRoleLoading">
                        确认
                    </el-button>
                </span>
            </template>
        </el-dialog>
        
        <!-- 日志详情对话框 -->
        <el-dialog v-model="logDetailVisible" title="日志详情" width="600px">
            <div v-if="currentLog" class="log-detail">
                <p><strong>ID:</strong> {{ currentLog.id }}</p>
                <p><strong>场景ID:</strong> {{ currentLog.sessionId }}</p>
                <p><strong>时间:</strong> {{ formatTime(currentLog.time) }}</p>
                <p>
                    <strong>类型:</strong>
                    <el-tag :type="getTagType(currentLog.type)" effect="dark">
                        {{ getLogTypeLabel(currentLog.type) }}
                    </el-tag>
                </p>
                <p><strong>模块:</strong> {{ currentLog.module }}</p>
                <p><strong>操作:</strong> {{ currentLog.action }}</p>
                <p><strong>信息:</strong> {{ currentLog.information }}</p>
                <p><strong>详情:</strong></p>
                <div class="detail-content">
                    {{ currentLog.details || '无详细信息' }}
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Setting } from '@element-plus/icons-vue';
import { useSystemLogStore, type LogEntry } from '../../store/modules/systemLog';
import { useTopoStore } from '../../store/modules/topo';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getUsers, deleteUser, changeRole } from '../../api/auth'; // 导入changeRole函数
import { getUserInfo } from '../../store/user'; // 导入获取用户信息的函数

const activeMenuItem = ref('1-1'); // 默认选中用户管理

const handleMenuSelect = (index: string) => {
    activeMenuItem.value = index;
    // 如果选择的是用户管理，自动加载用户列表
    if (index === '1-1') {
        refreshUserList();
    }
};

// 获取存储
const systemLogStore = useSystemLogStore();
const topoStore = useTopoStore();

// 加载状态
const loading = ref(false);
const backendLoading = ref(false);

// 日志相关状态
const logSource = ref<'local' | 'backend'>('local');
const sessionIdInput = ref('');

// 日志筛选条件
const logTypeFilter = ref('all');
const moduleFilter = ref('all');

// 当前选中的日志和详情对话框
const currentLog = ref<LogEntry | null>(null);
const logDetailVisible = ref(false);

// 用户列表相关
const userList = ref<any[]>([]); // 存储用户列表数据
const tableLoading = ref(false); // 表格加载状态
const currentUserInfo = ref<any>(null); // 当前登录用户信息

// 检查当前用户是否为管理员
const isAdmin = computed(() => {
    return currentUserInfo.value && currentUserInfo.value.type === 1;
});

// 当前场景ID
const currentSessionId = computed(() => {
    return topoStore.topoData?.id;
});

// 根据筛选条件获取日志列表
const filteredLogsList = computed((): LogEntry[] => {
    let result: LogEntry[] = logSource.value === 'local'
        ? systemLogStore.sortedLogs
        : systemLogStore.sortedBackendLogs;

    // 按类型筛选
    if (logTypeFilter.value !== 'all') {
        result = result.filter(log => log.type === logTypeFilter.value);
    }

    // 按模块筛选
    if (moduleFilter.value !== 'all') {
        result = result.filter(log => log.module === moduleFilter.value);
    }

    return result;
});

// 应用日志筛选
const applyFilters = () => {
    // 实际上由于使用了computed属性，这里不需要做什么
    ElMessage.success('筛选已应用');
};

// 重置日志筛选
const resetFilters = () => {
    logTypeFilter.value = 'all';
    moduleFilter.value = 'all';
    ElMessage.success('筛选已重置');
};

// 获取后端日志
const fetchBackendLogs = async () => {
    if (!sessionIdInput.value && !currentSessionId.value) {
        ElMessage.warning('请输入场景ID或确保已加载场景');
        return;
    }

    backendLoading.value = true;
    try {
        const targetSessionId = sessionIdInput.value ? parseInt(sessionIdInput.value) : currentSessionId.value;
        await systemLogStore.fetchBackendLogs(targetSessionId);
        ElMessage.success(`成功获取${systemLogStore.backendLogs.length}条后端日志`);
    } catch (error: any) {
        ElMessage.error(error.message || '获取后端日志失败');
    } finally {
        backendLoading.value = false;
    }
};

// 获取用户类型对应的标签类型
const getUserTypeTagType = (type: number) => {
    const types: {[key: number]: string} = {
        1: 'danger', // 管理员
        2: 'info',   // 普通用户
    };
    return types[type] || 'info';
};

// 获取用户类型名称
const getUserTypeName = (type: number) => {
    const names: {[key: number]: string} = {
        1: '管理员',
        2: '普通用户'
    };
    return names[type] || '普通用户';
};

// 获取日志类型对应的标签类型
const getTagType = (type: string): 'success' | 'warning' | 'danger' | 'info' => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
        // 本地日志类型
        'success': 'success',
        'warning': 'warning',
        'error': 'danger',
        'info': 'info',
        // 后端日志类型
        'important': 'danger',
        'normal': 'info'
    };
    return map[type] || 'info';
};

// 获取日志类型的中文标签
const getLogTypeLabel = (type: string): string => {
    const map: Record<string, string> = {
        // 本地日志类型
        'success': '成功',
        'warning': '警告',
        'error': '错误',
        'info': '信息',
        // 后端日志类型
        'important': '重要',
        'normal': '普通'
    };
    return map[type] || '信息';
};

// 刷新用户列表
const refreshUserList = async () => {
    tableLoading.value = true;
    try {
        const users = await getUsers();
        
        // 对用户列表进行排序，管理员在前，普通用户在后
        const sortedUsers = [...(users || [])].sort((a, b) => {
            // 首先按type排序（管理员type=1在前，普通用户type=2在后）
            // 升序排列：值小的在前，所以管理员(type=1)会排在普通用户(type=2)之前
            if (a.type !== b.type) {
                return a.type - b.type;
            }
            // 如果type相同，则按用户名字母顺序排序
            return a.username.localeCompare(b.username);
        });
        
        userList.value = sortedUsers;
        
        // 如果用户列表为空，显示提示
        if (!users || users.length === 0) {
            ElMessage.warning('未获取到任何用户数据');
        } else {
            ElMessage.success(`成功获取到 ${users.length} 个用户`);
        }
    } catch (error) {
        console.error('获取用户列表失败:', error);
        ElMessage.error('获取用户列表失败，请检查网络或后端服务');
    } finally {
        tableLoading.value = false;
    }
};

// 分配角色相关
const roleDialogVisible = ref(false);
const currentUser = ref<any>(null);
const selectedRole = ref<number>(1); // 默认选择白方
const assignRoleLoading = ref(false);

// 获取角色对应的标签类型
const getRoleTagType = (role: number) => {
    const types: {[key: number]: string} = {
        1: 'info',   // 白方
        2: 'warning', // 红方
        3: 'danger'  // 蓝方
    };
    return types[role] || 'info';
};

// 获取角色名称
const getRoleName = (role: number) => {
    const names: {[key: number]: string} = {
        1: '白方',
        2: '红方',
        3: '蓝方'
    };
    return names[role] || '暂无';
};

// 处理分配角色
const handleAssignRole = (user: any) => {
    // 检查当前用户是否为管理员
    if (!isAdmin.value) {
        ElMessage.warning('只有管理员用户才能分配角色');
        return;
    }
    
    currentUser.value = user;
    selectedRole.value = user.role || 1; // 默认设置为当前角色
    roleDialogVisible.value = true;
};

// 确认分配角色
const confirmAssignRole = async () => {
    if (!currentUser.value) return;
    
    // 如果选择的角色与当前角色相同，则不需要更新
    if (selectedRole.value === currentUser.value.role) {
        ElMessage.info('未更改角色');
        roleDialogVisible.value = false;
        return;
    }
    
    assignRoleLoading.value = true;
    try {
        await changeRole(
            currentUser.value.username, 
            currentUser.value.type, 
            selectedRole.value
        );
        
        ElMessage.success(`成功将用户 ${currentUser.value.username} 的角色更改为 ${getRoleName(selectedRole.value)}`);
        
        // 添加系统日志
        systemLogStore.addLog({
            type: 'important',
            module: '用户管理',
            action: '分配角色',
            information: '用户角色分配成功',
            details: `成功将用户 ${currentUser.value.username} 的角色从 ${getRoleName(currentUser.value.role)} 更改为 ${getRoleName(selectedRole.value)}`
        });
        
        // 关闭对话框并刷新用户列表
        roleDialogVisible.value = false;
        await refreshUserList();
    } catch (error) {
        console.error('更改角色失败:', error);
        ElMessage.error('更改角色失败，请稍后再试');
        
        // 添加系统日志
        systemLogStore.addLog({
            type: 'important',
            module: '用户管理',
            action: '分配角色',
            information: '用户角色分配失败',
            details: `更改用户 ${currentUser.value.username} 角色失败：${(error as Error).message || '未知错误'}`
        });
    } finally {
        assignRoleLoading.value = false;
    }
};

// 处理删除用户
const handleDeleteUser = (user: any) => {
    // 检查当前用户是否为管理员
    if (!isAdmin.value) {
        ElMessage.warning('只有管理员用户才能删除用户');
        return;
    }
    
    // 获取当前登录用户信息
    const currentUser = currentUserInfo.value;
    
    // 检查是否是当前登录用户
    if (user.username === currentUser.username && user.type === currentUser.type) {
        ElMessage.warning('不能删除当前登录用户');
        return;
    }
    
    ElMessageBox.confirm(
        `确认要删除用户 ${user.username} 吗？`,
        '删除用户',
        {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'warning'
        }
    ).then(async () => {
        try {
            // 调用删除用户API
            await deleteUser(user.username, user.type);
            ElMessage.success(`成功删除用户 ${user.username}`);
            // 删除成功后刷新用户列表
            await refreshUserList();
            // 添加系统日志
            systemLogStore.addLog({
                type: 'important',
                module: '用户管理',
                action: '删除用户',
                information: '用户删除成功',
                details: `成功删除用户：${user.username}，类型：${getUserTypeName(user.type)}`
            });
        } catch (error) {
            console.error('删除用户失败:', error);
            ElMessage.error('删除用户失败，请稍后再试');
            // 添加系统日志
            systemLogStore.addLog({
                type: 'important',
                module: '用户管理',
                action: '删除用户',
                information: '用户删除失败',
                details: `删除用户失败：${user.username}，错误信息：${(error as Error).message || '未知错误'}`
            });
        }
    }).catch(() => {
        // 用户取消删除
    });
};

// 确认清空日志
const confirmClearLogs = () => {
    ElMessageBox.confirm('确定要清空所有日志吗？此操作不可恢复。', '确认清空', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(() => {
        systemLogStore.clearLogs();
        ElMessage.success('所有日志已清空');
    }).catch(() => {
        ElMessage.info('已取消清空操作');
    });
};

// 导出日志
const exportLogs = () => {
    const jsonString = systemLogStore.exportLogs();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    ElMessage.success('日志已导出');
};

// 显示日志详情
const showLogDetail = (log: LogEntry) => {
    currentLog.value = log;
    logDetailVisible.value = true;
};

// 格式化时间戳
const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
};

// 页面加载时获取用户列表
onMounted(() => {
    loading.value = true;
    
    // 加载日志数据
    systemLogStore.loadFromLocalStorage();
    loading.value = false;

    // 获取当前登录用户信息
    currentUserInfo.value = getUserInfo();

    if (activeMenuItem.value === '1-1') {
        refreshUserList();
    }
});

</script>

<style scoped lang="scss">
.system-container {
    height: 100%;
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
    
    .system-logs {
        height: calc(100% - 40px);

        .log-operations {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;

            .filter-form {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 10px;
            }

            .right-operations {
                display: flex;
                gap: 10px;
            }
        }

        .session-info {
            margin-bottom: 15px;
        }
    }
    
    .log-detail {
        .detail-content {
            padding: 10px;
            background-color: #f8f8f8;
            border-radius: 4px;
            border: 1px solid #eee;
            margin-top: 10px;
            white-space: pre-wrap;
            font-family: monospace;
            max-height: 300px;
            overflow-y: auto;
        }
    }

    .user-management-card {
        margin-top: 20px;
        
        .card-header {
            margin-bottom: 20px;
            display: flex;
            justify-content: flex-end;
        }
    }

    .role-assignment {
        padding: 10px;
        
        .role-selection {
            margin-top: 20px;
            
            .el-radio {
                margin-right: 15px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
            }
        }
    }
}
</style>