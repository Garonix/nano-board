/**
 * 简单密码验证组件
 * 前端JavaScript实现的简单密码验证
 * 支持通过环境变量自定义密码
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
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 animate-fade-in">
      <div className="max-w-md w-full space-y-8">
        {/* 现代化头部 */}
        <div className="text-center animate-scale-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <span className="text-white font-bold text-2xl">N</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
            Nano Board
          </h1>
          <p className="text-neutral-600 text-lg">
            极简白板应用
          </p>
        </div>

        <div className="bg-surface-elevated rounded-2xl shadow-xl p-8 border border-border backdrop-blur-sm animate-scale-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* 现代化表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-3">
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
                    'modern-input w-full px-4 py-3 text-lg',
                    'placeholder-neutral-400',
                    error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''
                  )}
                  placeholder="请输入密码"
                  disabled={isLoading}
                  autoFocus
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              {error && (
                <div className="mt-3 flex items-center gap-2 text-error-600 animate-scale-fade-in">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            {/* 现代化提交按钮 */}
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className={cn(
                'w-full py-4 px-6 text-lg font-semibold rounded-lg transition-all duration-200',
                'focus:outline-none focus:ring-4 focus:ring-primary-500/20',
                isLoading || !password.trim()
                  ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl'
              )}
            >
              <span className="flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin-modern"></div>
                    <span>验证中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>进入白板</span>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* 现代化底部提示 */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-full">
              <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-neutral-600">
                请联系管理员获取访问密码
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
