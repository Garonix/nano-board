/**
 * 环境变量配置和类型定义
 */

export interface AppEnvironment {
  enablePasswordAuth: boolean;
  accessPassword?: string;
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  maxFileSize: number;
  maxFileCount: number;
}
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
      true // 默认启用密码验证，提供安全保护
    ),

    // 自定义访问密码
    accessPassword: process.env.ACCESS_PASSWORD || undefined,

    // 环境类型
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',

    // 应用端口
    port: parseNumberEnv(process.env.PORT, 3000),

    // 文件上传配置
    maxFileSize: parseNumberEnv(process.env.MAX_FILE_SIZE, 10 * 1024 * 1024), // 默认10MB
    maxFileCount: parseNumberEnv(process.env.MAX_FILE_COUNT, 100), // 默认100个文件
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
    // 如果启用了密码验证但没有设置自定义密码，使用默认密码
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
