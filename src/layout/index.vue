<template>
  <div class="layout-container">
    <el-container>
      <!-- 顶部导航栏 -->
      <el-header height="60px">
        <div class="header-container">
          <div class="logo-section">
            <div class="logo-icon">
              <div class="logo-symbol">
                <div class="symbol-ring"></div>
                <div class="symbol-core"></div>
              </div>
            </div>
            <div class="logo-content">
              <span class="logo-text">机动网络环境仿真系统V1.0</span>
            </div>
          </div>

          <el-menu :default-active="$route.path" class="horizontal-menu" mode="horizontal" background-color="transparent"
            text-color="var(--secondary-text-color)" active-text-color="var(--active-color)">
              <el-menu-item index="/simu/view" @click="handleMenuClick('/simu/view')">
                <el-icon>
                  <Monitor />
                </el-icon>
                <span>仿真场景编辑</span>
              </el-menu-item>

              <el-menu-item index="/simu/signal" @click="handleMenuClick('/simu/signal')">
                <el-icon>
                  <Histogram />
                </el-icon>
                <span>信号级仿真</span>
              </el-menu-item>

              <el-menu-item index="/simu/simulation" @click="handleMenuClick('/simu/simulation')">
                <el-icon>
                  <DataAnalysis />
                </el-icon>
                <span>测试工具</span>
              </el-menu-item>

              <el-menu-item index="/simu/srclibrary" @click="handleMenuClick('/simu/srclibrary')">
                <el-icon>
                  <Collection />
                </el-icon>
                <span>资源库管理</span>
              </el-menu-item>

              <el-menu-item index="/simu/system" @click="handleMenuClick('/simu/system')">
                <el-icon>
                  <Setting />
                </el-icon>
                <span>系统管理</span>
              </el-menu-item>
          </el-menu>

          <div class="viewer-section">
            <el-tooltip content="进入三维态势展示" placement="bottom" effect="light">
              <el-button type="primary" @click="enterEarthView" class="earth-view-btn" :icon="View">
                态势展示
              </el-button>
            </el-tooltip>
          </div>

          <!-- 添加主题切换按钮 -->
          <div class="theme-section">
            <ThemeSwitcher />
          </div>

          <div class="user-section">
            <el-dropdown trigger="click">
              <div class="user-info">
                <el-avatar :size="32" :class="{ 'default-avatar': !userInfo.hasRole }" 
                          :style="userInfo.hasRole ? { backgroundColor: userInfo.bgColor } : {}" />
                <span class="username" 
                      :style="userInfo.hasRole && userInfo.role === 'white' ? 
                             {color: '#FFFFFF'} : 
                             (userInfo.hasRole ? {color: userInfo.color} : {})">
                  {{ userInfo.hasRole && userInfo.name ? `${userInfo.name}(${userInfo.username})` : userInfo.username || '未登录' }}
                </span>
                <el-icon>
                  <ArrowDown />
                </el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item divided @click="handleLogout">
                    <el-icon>
                      <SwitchButton />
                    </el-icon>
                    <span>退出登录</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-container class="main-content">
        <!-- 右侧内容区 -->
        <el-main class="content-area">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useRouter, } from 'vue-router';
import { onMounted, ref } from 'vue';
import {
  Monitor,
  DataAnalysis,
  Setting,
  SwitchButton,
  ArrowDown,
  Message,
  View,
  Histogram,
  Collection
} from '@element-plus/icons-vue';
import ThemeSwitcher from '../components/ThemeSwitcher.vue'; // 导入主题切换组件
import { getUserInfo, clearUserInfo } from '../store/user';
import { useThemeStore } from '../store/modules/theme'; // 导入主题存储

// 用户信息类型
interface UserInfo {
  username: string;
  hasRole?: boolean;
  role?: string;
  name?: string;
  color?: string;
  bgColor?: string;
}

const router = useRouter();
const themeStore = useThemeStore(); // 使用主题 store
const userInfo = ref<UserInfo>({
  username: '',
  hasRole: false
});

// 初始化时获取用户信息和主题
onMounted(() => {
  // 获取用户信息
  const info = getUserInfo();
  if (info && info.username) {
    userInfo.value = {
      username: info.username || '',
      hasRole: info.hasRole || false,
      role: info.role || '',
      name: info.name || '',
      color: info.color || '',
      bgColor: info.bgColor || ''
    };

    // 如果用户有角色，根据角色设置主题
    if (info.hasRole && info.role) {
      themeStore.setThemeByRole(info.role);
    } else {
      // 如果没有角色，使用默认主题
      themeStore.initTheme();
    }
  } else {
    // 如果没有用户信息，跳转到登录页
    router.push('/login');
  }
});

// 处理顶部菜单点击事件
const handleMenuClick = (path: string) => {
  router.push(path);
};

// 跳转到消息中心
const goToMessageCenter = () => {
  router.push('/simu/message');
};

const handleLogout = () => {
  // 清除用户信息
  clearUserInfo();
  router.push('/login');
};

// 进入地球态势展示页面
const enterEarthView = () => {
  // 使用全屏模式打开地球视图
  window.open('/viewer', '_blank');
};

</script>

<style scoped lang="scss">
.layout-container {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;

  .el-container {
    height: 100%;
  }

  .el-header {
    background-color: var(--header-bg-from, #0a1228);
    background-image: linear-gradient(135deg, var(--header-bg-from, #0a1228) 0%, var(--sidebar-bg-middle, #1a1a40) 50%, var(--header-bg-to, #2c0a16) 100%);
    color: var(--primary-text-color, #fff);
    padding: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    .header-container {
      height: 100%;
      display: flex;
      align-items: center;

      .logo-section {
        min-width: 200px;
        display: flex;
        align-items: center;
        padding: 0 16px;
        gap: 12px;
        position: relative;

        .logo-icon {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-symbol {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .symbol-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid transparent;
          border-radius: 50%;
          background: linear-gradient(135deg, #76b9ff, #a855f7) border-box;
          -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: subtract;
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask-composite: subtract;
          animation: logo-rotate 8s linear infinite;
        }

        .symbol-core {
          position: absolute;
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #76b9ff, #a855f7);
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(120, 60, 255, 0.5);
          animation: logo-pulse 2s ease-in-out infinite;
        }

        .logo-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .logo-text {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--primary-text-color, #ffffff);
          text-shadow: 0 0 10px rgba(120, 60, 255, 0.3);
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #76b9ff, #a855f7);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.2;
          white-space: nowrap;
        }

        &:hover .symbol-ring {
          animation-duration: 2s;
        }

        &:hover .symbol-core {
          animation-duration: 1s;
        }

        &:hover .logo-text {
          text-shadow: 0 0 20px rgba(120, 60, 255, 0.6);
        }
      }

      .horizontal-menu {
        flex: 1;
        border-bottom: none;
        background-color: transparent !important;

        .el-menu-item {
          height: 60px;
          line-height: 60px;
          color: var(--secondary-text-color, #a6c9ff) !important;

          .el-icon {
            margin-right: 5px;
            vertical-align: middle;
            color: var(--secondary-text-color, #a6c9ff);
          }

          span {
            vertical-align: middle;
          }

          &:hover {
            background-color: var(--hover-color, rgba(120, 60, 255, 0.1)) !important;
            border-radius: 4px;
            color: var(--primary-color, #a48fff) !important;

            .el-icon {
              color: var(--primary-color, #a48fff);
            }
          }

          &.is-active {
            color: var(--active-color, #ff3c78) !important;
            border-bottom: 2px solid var(--active-color, #ff3c78) !important;
            background-color: var(--hover-color, rgba(255, 60, 120, 0.1)) !important;

            .el-icon {
              color: var(--active-color, #ff3c78);
            }
          }
        }
      }

      .viewer-section {
        margin: 0 16px;

        .earth-view-btn {
          background: linear-gradient(90deg, var(--primary-color, #783cff), var(--secondary-color, #ff3c78)) !important;
          border-color: var(--primary-color, #783cff) !important;
          font-weight: 500;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          justify-content: center;

          &:hover {
            background: linear-gradient(90deg, var(--primary-light-color, #8f5cff), var(--secondary-color, #ff5c98)) !important;
            border-color: var(--primary-light-color, #8f5cff) !important;
            box-shadow: 0 0 15px var(--shadow-color, rgba(120, 60, 255, 0.4));
          }

          .el-icon {
            margin-right: 4px;
          }
        }
      }

      .theme-section {
        margin: 0 16px;
      }

      .user-section {
        padding: 0 16px;

        .user-info {
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;

          &:hover {
            background-color: var(--hover-color, rgba(120, 60, 255, 0.1));
          }

          .username {
            margin: 0 8px;
            color: var(--primary-text-color, #fff);
            font-size: 14px;
          }

          .el-icon {
            color: var(--primary-text-color, #fff);
            font-size: 12px;
          }
          
          .default-avatar {
            background-color: var(--primary-color, #a48fff);
          }
        }

        .logout-btn {
          color: var(--primary-text-color, #fff);

          .el-icon {
            margin-right: 4px;
            vertical-align: middle;
          }

          span {
            vertical-align: middle;
          }

          &:hover {
            background-color: rgba(255, 60, 120, 0.1);
            border-radius: 4px;
          }
        }
      }
    }
  }

  .main-content {
    position: relative;
    height: calc(100vh - 60px);

    .content-area {
      background-color: #f0f2f5;
      background-image: linear-gradient(135deg, rgba(10, 18, 40, 0.02), rgba(44, 10, 22, 0.02));
      padding: 20px;
      overflow: auto;
      border: none;
      height: 100%;
      position: relative;
    }
  }
}

// Logo动画效果
@keyframes logo-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes logo-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 15px rgba(120, 60, 255, 0.5);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 25px rgba(120, 60, 255, 0.8);
  }
}
</style>