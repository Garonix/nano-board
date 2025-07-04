import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker部署配置 - 启用standalone输出模式
  output: 'standalone',

  // 其他配置选项
  serverExternalPackages: [],

  // 注意：移除env配置，避免构建时固化环境变量
  // 环境变量将在运行时通过process.env直接读取
};

export default nextConfig;
