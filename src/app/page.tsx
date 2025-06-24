/**
 * 主页面组件
 * 极简 Nano Board 白板应用
 * 根据环境变量控制是否显示密码验证界面
 */

'use client';

import React, { useState, useEffect } from 'react';
import { PasswordAuth } from '@/components/PasswordAuth';
import { BoardEditor } from '@/components/BoardEditor';
import { getClientEnvironment } from '@/lib/env';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 获取环境配置
  const { enablePasswordAuth } = getClientEnvironment();

  // 检查是否已经认证
  useEffect(() => {
    // 如果未启用密码验证，直接设置为已认证状态
    if (!enablePasswordAuth) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    // 启用密码验证时，检查sessionStorage中的认证状态
    const authStatus = sessionStorage.getItem('nano-board-auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [enablePasswordAuth]);

  // 认证成功回调
  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-500">
            {enablePasswordAuth ? '检查认证状态...' : '初始化应用...'}
          </div>
        </div>
      </div>
    );
  }

  // 根据环境变量决定是否显示密码验证界面
  // 当 ENABLE_PASSWORD_AUTH=false 或未设置时，直接进入主应用
  if (enablePasswordAuth && !isAuthenticated) {
    return <PasswordAuth onAuthenticated={handleAuthenticated} />;
  }

  // 进入主应用界面
  return <BoardEditor />;
}
