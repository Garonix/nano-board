import { NextResponse } from 'next/server';
import { getAppEnvironment } from '@/lib/env';

/**
 * 配置API端点
 * 提供客户端需要的配置信息，解决Next.js环境变量传递问题
 */
export async function GET() {
  try {
    const env = getAppEnvironment();
    
    // 只返回客户端需要的配置信息，不暴露敏感信息
    const clientConfig = {
      enablePasswordAuth: env.enablePasswordAuth,
      // 不返回实际密码，只返回是否设置了密码
      hasCustomPassword: !!env.accessPassword,
    };

    return NextResponse.json(clientConfig);
  } catch (error) {
    console.error('获取配置失败:', error);
    
    // 发生错误时返回安全的默认配置
    return NextResponse.json({
      enablePasswordAuth: true, // 默认启用密码验证，确保安全
      hasCustomPassword: false,
    });
  }
}
