/**
 * 应用主页面
 * @description 根据环境配置控制密码验证和主应用入口
 */

'use client';

import React, { useState, useEffect } from 'react';
import { PasswordAuth } from '@/components/PasswordAuth';
import { BoardEditor } from '@/components/BoardEditor';
import { useConfig } from '@/hooks/useConfig';

/**
 * 主页面组件
 */
export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 通过API获取配置信息，解决Next.js环境变量传递问题
  const { config, loading: configLoading, error: configError } = useConfig();

  /** 检查认证状态 */
  useEffect(() => {
    // 等待配置加载完成
    if (configLoading || !config) {
      return;
    }

    if (!config.enablePasswordAuth) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    // 检查本地存储的认证状态
    if (typeof window !== 'undefined') {
      const authStatus = sessionStorage.getItem('nano-board-auth');
      if (authStatus === 'true') {
        setIsAuthenticated(true);
      }
    }

    setIsLoading(false);
  }, [config, configLoading, configError]);

  /** 认证成功回调 */
  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  // 显示加载状态（配置加载中或应用初始化中）
  if (isLoading || configLoading || !config) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center animate-fade-in">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-white font-bold text-xl">N</span>
          </div>

          <div className="text-lg font-medium text-foreground mb-6">
            {configLoading ? '加载配置中' : config?.enablePasswordAuth ? '验证身份中' : '启动应用中'}
          </div>

          <div className="w-48 mx-auto">
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full animate-pulse-modern"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 显示密码验证界面
  if (config.enablePasswordAuth && !isAuthenticated) {
    return <PasswordAuth onAuthenticated={handleAuthenticated} />;
  }

  return <BoardEditor />;
}
