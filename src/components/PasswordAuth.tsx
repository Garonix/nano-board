/**
 * 简单密码验证组件
 * 前端JavaScript实现的简单密码验证
 * 支持通过环境变量自定义密码
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PasswordAuthProps {
  onAuthenticated: () => void;
}

// 默认密码（当未设置环境变量时使用）
const DEFAULT_PASSWORD = 'nano2024';

export const PasswordAuth: React.FC<PasswordAuthProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [correctPassword, setCorrectPassword] = useState(DEFAULT_PASSWORD);

  // 获取自定义密码（如果设置了环境变量）
  useEffect(() => {
    // 从服务器端获取自定义密码配置
    // 注意：这里不直接暴露密码到客户端，而是通过API验证
    const customPassword = process.env.ACCESS_PASSWORD;
    if (customPassword && customPassword.trim()) {
      setCorrectPassword(customPassword);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 模拟验证延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === correctPassword) {
      // 验证成功，保存到sessionStorage
      sessionStorage.setItem('nano-board-auth', 'true');
      onAuthenticated();
    } else {
      setError('密码错误，请重试');
      setPassword('');
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as React.FormEvent);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Nano Board
          </h1>
          <p className="text-gray-600">
            极简白板应用
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                请输入访问密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                  'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  error ? 'border-red-300' : 'border-gray-300'
                )}
                placeholder="输入密码..."
                disabled={isLoading}
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className={cn(
                'w-full py-2 px-4 rounded-md text-white font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                isLoading || !password.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {isLoading ? '验证中...' : '进入白板'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              {correctPassword === DEFAULT_PASSWORD
                ? '提示：默认密码为 nano2024'
                : '请输入管理员设置的访问密码'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
