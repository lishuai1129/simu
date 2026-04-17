<template>
  <div class="login-container">
    <div class="form-container">
      <el-form
        class="login-form"
        :model="loginForm"
        :rules="rules"
        ref="loginFormRef"
      >
        <h1 class="title">机动网络环境仿真系统V1.0</h1>
        
        <!-- 切换登录/注册模式 -->
        <div class="mode-toggle">
          <el-radio-group v-model="formMode" class="mode-radio-group">
            <el-radio-button label="login">登录</el-radio-button>
            <el-radio-button label="register">注册</el-radio-button>
          </el-radio-group>
        </div>
        
        <!-- 角色选择 -->
        <div class="role-selector">
          <div class="role-options">
            <div 
              class="role-option" 
              :class="{ active: loginForm.type === 1 }"
              @click="selectUserType(1)"
            >
              <div class="role-avatar admin">
                <el-icon><User /></el-icon>
              </div>
              <div class="role-name">管理员</div>
            </div>
            <div 
              class="role-option" 
              :class="{ active: loginForm.type === 2 }"
              @click="selectUserType(2)"
            >
              <div class="role-avatar user">
                <el-icon><User /></el-icon>
              </div>
              <div class="role-name">普通用户</div>
            </div>
          </div>
        </div>
        
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            show-password
            placeholder="请输入密码"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item v-if="formMode === 'register'" prop="confirmPassword">
          <el-input
            v-model="loginForm.confirmPassword"
            type="password"
            show-password
            placeholder="请确认密码"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button
            class="login-btn"
            type="primary"
            @click="submitForm"
            size="default"
            :loading="loading"
          >{{ formMode === 'login' ? '登录' : '注册' }}</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { User, Lock } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import { reactive, ref, computed } from "vue";
import { ElMessage } from "element-plus";
import { setUserInfo, setUserRole } from "../../store/user";
import { login, register, numberToRole, parseComplexResponse } from "../../api/auth";
import { setUserToken } from "../../api/request";
import { useSystemLogStore } from "../../store/modules/systemLog";

// 获取路由器实例
const router = useRouter();
// 获取日志 store
const systemLogStore = useSystemLogStore();
// 表单引用
const loginFormRef = ref(null);
// 加载状态
const loading = ref(false);
// 表单模式：登录或注册
const formMode = ref("login");

// 登录表单数据
const loginForm = reactive({
  username: "",
  password: "",
  confirmPassword: "", // 仅注册时使用
  type: 2 // 默认选择普通用户
});

// 表单验证规则
const rules = computed(() => {
  const baseRules = {
    username: [
      { required: true, message: "请输入用户名", trigger: "blur" },
      { min: 2, max: 10, message: "长度在 2 到 10 个字符", trigger: "blur" }
    ],
    password: [
      { required: true, message: "请输入密码", trigger: "blur" },
      { min: 3, max: 20, message: "长度在 3 到 20 个字符", trigger: "blur" }
    ]
  };
  
  // 如果是注册模式，添加确认密码验证
  if (formMode.value === "register") {
    baseRules.confirmPassword = [
      { required: true, message: "请确认密码", trigger: "blur" },
      {
        validator: (rule, value, callback) => {
          if (value !== loginForm.password) {
            callback(new Error("两次输入的密码不一致"));
          } else {
            callback();
          }
        },
        trigger: "blur"
      }
    ];
  }
  
  return baseRules;
});

// 选择用户类型
const selectUserType = (type) => {
  loginForm.type = type;
};

// 提交表单（登录或注册）
const submitForm = async () => {
  if (!loginFormRef.value) return;
  
  if (!loginForm.type) {
    ElMessage.warning("请选择用户类型");
    return;
  }
  
  try {
    loading.value = true;
    await loginFormRef.value.validate();
    
    if (formMode.value === "login") {
      await handleLogin();
    } else {
      await handleRegister();
    }
  } catch (error) {
    console.error(formMode.value === "login" ? "登录失败" : "注册失败", error);
    ElMessage.error(formMode.value === "login" ? "登录失败，请检查用户名和密码" : "注册失败，请检查输入信息");
  } finally {
    loading.value = false;
  }
};

// 登录处理
const handleLogin = async () => {
  try {
    // 记录登录尝试
    systemLogStore.addLog({
      type: 'normal',
      module: 'auth',
      action: '用户登录尝试',
      information: '用户登录',
      details: `用户 "${loginForm.username}" 尝试登录，用户类型: ${loginForm.type === 1 ? '管理员' : '普通用户'}`
    });

    const response = await login(loginForm.username, loginForm.password, loginForm.type);

    // 解析响应数据，提取用户信息
    const parsedResponse = parseComplexResponse(response);

    // 从解析后的响应中获取用户信息
    let userId = '';
    let username = loginForm.username;
    let userType = loginForm.type;
    let roleData = null;

    if (parsedResponse) {
      userId = parsedResponse.id || '';
      username = parsedResponse.username || loginForm.username;
      userType = parsedResponse.type || loginForm.type;
      roleData = parsedResponse.role;
    }

    // 如果解析失败，尝试从原始响应获取
    if (!userId && response.id) {
      userId = response.id;
    }
    if (!username && response.username) {
      username = response.username;
    }


    // 保存用户基本信息，确保包含用户ID
    setUserInfo('', userId, username, userType);

    // 如果登录成功，检查是否有token并保存
    if (response.token) {
      setUserToken(response.token);
    } else if (parsedResponse && parsedResponse.token) {
      setUserToken(parsedResponse.token);
    }

    // 如果成功获取到角色，设置用户角色
    if (roleData !== null && typeof roleData === 'number') {
      const roleString = numberToRole(roleData);
      setUserRole(roleString);
    } else {
    }

    // 记录登录成功
    systemLogStore.addLog({
      type: 'important',
      module: 'auth',
      action: '用户登录成功',
      information: '用户登录成功',
      details: `用户 "${username}" (ID: ${userId}) 成功登录系统，用户类型: ${userType === 1 ? '管理员' : '普通用户'}`
    });

    ElMessage.success("登录成功");
    router.push("/simu");
  } catch (error) {
    // 记录登录失败
    systemLogStore.addLog({
      type: 'important',
      module: 'auth',
      action: '用户登录失败',
      information: '用户登录失败',
      details: `用户 "${loginForm.username}" 登录失败: ${error.message || '未知错误'}`
    });

    console.error("登录失败", error);
    throw error;
  }
};

// 注册处理
const handleRegister = async () => {
  try {
    // 记录注册尝试
    systemLogStore.addLog({
      type: 'normal',
      module: 'auth',
      action: '用户注册尝试',
      information: '用户注册',
      details: `用户 "${loginForm.username}" 尝试注册，用户类型: ${loginForm.type === 1 ? '管理员' : '普通用户'}`
    });

    const response = await register(loginForm.username, loginForm.password, loginForm.type);

    // 记录注册成功
    systemLogStore.addLog({
      type: 'important',
      module: 'auth',
      action: '用户注册成功',
      information: '用户注册成功',
      details: `用户 "${loginForm.username}" 注册成功，用户类型: ${loginForm.type === 1 ? '管理员' : '普通用户'}`
    });

    ElMessage.success("注册成功，请登录");
    formMode.value = "login"; // 切换到登录模式
    loginForm.confirmPassword = ""; // 清除确认密码
  } catch (error) {
    // 记录注册失败
    systemLogStore.addLog({
      type: 'important',
      module: 'auth',
      action: '用户注册失败',
      information: '用户注册失败',
      details: `用户 "${loginForm.username}" 注册失败: ${error.message || '未知错误'}`
    });

    console.error("注册失败", error);
    throw error;
  }
};
</script>

<style lang="scss" scoped>
.login-container {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: url("../../assets/image/backgroud.jpg") no-repeat center center fixed;
  background-size: cover;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.form-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 450px;
  margin: 0 auto;
}

.login-form {
  width: 100%;
  background: url("../../assets/image/login_form.png") no-repeat;
  background-size: 100% 100%;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.title {
  color: white;
  font-size: 22px;
  text-align: center;
  margin-bottom: 20px;
}

.mode-toggle {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.mode-radio-group {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 2px;
}

.role-selector {
  margin-bottom: 20px;
}


.role-options {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.role-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 10px;
  border-radius: 6px;
  transition: all 0.3s;
  
  &:hover, &.active {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  &.active .role-avatar {
    transform: scale(1.1);
  }
}

.role-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
  transition: all 0.3s;
  
  &.admin {
    background-color: #FFFFFF;
    color: black;
  }
  
  &.user {
    background-color: #409EFF;
    color: white;
  }
  
  .el-icon {
    font-size: 24px;
  }
}

.role-name {
  color: white;
  font-size: 14px;
}

.login-btn {
  width: 100%;
  margin-top: 10px;
}

@media screen and (max-width: 768px) {
  .form-container {
    margin: 0 auto;
    padding: 0 20px;
    max-width: 100%;
  }
  
  .login-form {
    padding: 30px 20px;
  }
  
  .role-options {
    flex-wrap: wrap;
  }
  
  .role-option {
    margin-bottom: 10px;
  }
}
</style>