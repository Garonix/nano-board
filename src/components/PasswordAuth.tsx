/**
 * 密码验证组件
 */

'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface PasswordAuthProps {
  onAuthenticated: () => void;
}

export const PasswordAuth: React.FC<PasswordAuthProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 通过 API 验证密码
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (result.success) {
        // 验证成功，保存到sessionStorage
        sessionStorage.setItem('nano-board-auth', 'true');
        onAuthenticated();
      } else {
        setError(result.error || '密码错误，请重试');
        setPassword('');
      }
    } catch (error) {
      console.error('验证请求失败:', error);
      setError('验证失败，请重试');
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
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4 animate-fade-in">
      <div className="max-w-md w-full space-y-8">
        {/* 现代化头部 - 蓝白配色设计 */}
        <div className="text-center animate-scale-fade-in">
          <h1 className="text-4xl font-bold text-blue-600 mb-3 tracking-tight">
            Nano Board
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100 backdrop-blur-sm animate-scale-fade-in hover:shadow-2xl transition-shadow duration-300" style={{ animationDelay: '0.1s' }}>
          {/* 现代化表单 - 与白板内容页面保持一致的表单设计 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-blue-700 mb-3 tracking-tight">
                访问密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    'modern-input w-full px-4 py-3 text-lg font-medium',
                    'placeholder-neutral-400',
                    error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''
                  )}
                  placeholder="请输入密码"
                  disabled={isLoading}
                  autoFocus
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-blue-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              {error && (
                <div className="mt-3 flex items-center gap-2 text-error-600 animate-scale-fade-in">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm font-medium tracking-tight">{error}</p>
                </div>
              )}
            </div>

            {/* 现代化提交按钮 - 与白板内容页面按钮样式保持一致 */}
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className={cn(
                'w-full py-4 px-6 text-lg font-semibold rounded-lg tracking-tight',
                'focus:outline-none focus:ring-4 focus:ring-blue-500/20',
                'border border-transparent',
                isLoading || !password.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl active:shadow-md transform hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              <span className="flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin-modern"></div>
                    <span className="font-medium">验证中...</span>
                  </>
                ) : (
                  <span className="font-medium">验证</span>
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
