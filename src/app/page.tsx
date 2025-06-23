/**
 * 主页面组件
 * 极简 Nano Board 白板应用
 */

'use client';

import React, { useState, useEffect } from 'react';
import { PasswordAuth } from '@/components/PasswordAuth';
import { BoardEditor } from '@/components/BoardEditor';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 检查是否已经认证
  useEffect(() => {
    const authStatus = sessionStorage.getItem('nano-board-auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // 认证成功回调
  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordAuth onAuthenticated={handleAuthenticated} />;
  }

  return <BoardEditor />;
}
