/**
 * 应用主页面
 * @description 根据环境配置控制密码验证和主应用入口
 */

'use client';

import React, { useState, useEffect } from 'react';
import { PasswordAuth } from '@/components/PasswordAuth';
import { BoardEditor } from '@/components/BoardEditor';
import { getClientEnvironment } from '@/lib/env';

/**
 * 主页面组件
 */
export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { enablePasswordAuth } = getClientEnvironment();

  /** 检查认证状态 */
  useEffect(() => {
    if (!enablePasswordAuth) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    const authStatus = sessionStorage.getItem('nano-board-auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [enablePasswordAuth]);

  /** 认证成功回调 */
  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center animate-fade-in">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-white font-bold text-xl">N</span>
          </div>

          <div className="text-lg font-medium text-foreground mb-6">
            {enablePasswordAuth ? '验证身份中' : '启动应用中'}
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

  if (enablePasswordAuth && !isAuthenticated) {
    return <PasswordAuth onAuthenticated={handleAuthenticated} />;
  }

  return <BoardEditor />;
}
