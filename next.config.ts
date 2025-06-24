import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 环境变量配置 - 将服务器端环境变量暴露给客户端
  env: {
    // 密码验证功能开关 - 暴露给客户端使用
    NEXT_PUBLIC_ENABLE_PASSWORD_AUTH: process.env.ENABLE_PASSWORD_AUTH || 'false',
    // 自定义访问密码（可选）- 仅服务器端使用，不暴露给客户端
    ACCESS_PASSWORD: process.env.ACCESS_PASSWORD || '',
  },

  // 其他配置选项
  serverExternalPackages: [],
};

export default nextConfig;
