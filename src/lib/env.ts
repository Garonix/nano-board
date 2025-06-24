/**
 * 环境变量配置和类型定义
 * 统一管理应用的环境变量，提供类型安全和默认值
 */

/**
 * 环境变量接口定义
 */
export interface AppEnvironment {
  /** 是否启用密码验证功能 */
  enablePasswordAuth: boolean;
  /** 自定义访问密码（可选） */
  accessPassword?: string;
  /** 当前环境类型 */
  nodeEnv: 'development' | 'production' | 'test';
  /** 应用端口 */
  port: number;
}

/**
 * 解析布尔值环境变量
 * @param value 环境变量值
 * @param defaultValue 默认值
 * @returns 布尔值
 */
function parseBooleanEnv(value: string | undefined, defaultValue: boolean = false): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * 解析数字环境变量
 * @param value 环境变量值
 * @param defaultValue 默认值
 * @returns 数字值
 */
function parseNumberEnv(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 获取应用环境配置
 * 从环境变量中读取配置，提供类型安全的访问方式
 */
export function getAppEnvironment(): AppEnvironment {
  return {
    // 密码验证功能开关
    // 支持多种环境变量读取方式，确保在不同环境中都能正常工作
    enablePasswordAuth: parseBooleanEnv(
      process.env.ENABLE_PASSWORD_AUTH ||
      process.env.NEXT_PUBLIC_ENABLE_PASSWORD_AUTH,
      false // 默认不启用密码验证
    ),

    // 自定义访问密码
    accessPassword: process.env.ACCESS_PASSWORD || undefined,

    // 环境类型
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',

    // 应用端口
    port: parseNumberEnv(process.env.PORT, 3000),
  };
}

/**
 * 客户端环境变量获取
 * 在客户端组件中使用，只能访问 NEXT_PUBLIC_ 前缀的环境变量或通过 next.config.ts 暴露的变量
 */
export function getClientEnvironment() {
  // 优先使用 NEXT_PUBLIC_ 前缀的环境变量，然后使用通过 next.config.ts 暴露的变量
  const enablePasswordAuth = parseBooleanEnv(
    process.env.NEXT_PUBLIC_ENABLE_PASSWORD_AUTH ||
    process.env.ENABLE_PASSWORD_AUTH,
    false
  );

  return {
    enablePasswordAuth,
  };
}

/**
 * 环境变量验证
 * 检查必要的环境变量是否正确设置
 */
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const env = getAppEnvironment();

  // 验证密码验证功能配置
  if (env.enablePasswordAuth && !env.accessPassword) {
    // 如果启用了密码验证但没有设置自定义密码，使用默认密码（仅开发环境警告）
    if (env.nodeEnv === 'development') {
      console.warn('⚠️  密码验证已启用但未设置 ACCESS_PASSWORD，将使用默认密码');
    }
  }

  // 验证端口配置
  if (env.port < 1 || env.port > 65535) {
    errors.push(`无效的端口号: ${env.port}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 导出环境配置实例
export const appEnv = getAppEnvironment();
