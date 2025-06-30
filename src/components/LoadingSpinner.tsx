/**
 * 加载状态组件
 * 显示加载动画和提示信息的通用组件
 * 可在应用的各个部分复用
 */

'use client';

import React from 'react';

/**
 * 加载状态组件的属性接口
 */
export interface LoadingSpinnerProps {
  /** 加载提示信息 */
  message?: string;
  /** 自定义样式类名 */
  className?: string;
  /** 是否全屏显示 */
  fullScreen?: boolean;
  /** 加载动画大小 */
  size?: 'small' | 'medium' | 'large';
}

/**
 * 加载状态组件
 * 提供统一的加载界面样式
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = '加载中...',
  className = '',
  fullScreen = true
  // size 参数已移除，因为简化后的设计不再需要不同尺寸
}) => {
  // 注释：getSizeClasses 函数已移除，因为简化后的设计不再需要不同尺寸

  // 根据是否全屏设置容器样式
  const containerClasses = fullScreen
    ? 'min-h-screen bg-surface flex items-center justify-center animate-fade-in'
    : 'flex items-center justify-center p-6 animate-fade-in';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center animate-scale-fade-in">
        {/* 简洁的加载提示文字 */}
        <p className="text-lg font-medium text-foreground mb-4">
          {message}
        </p>

        {/* 进度条指示器 */}
        <div className="w-32 h-2 bg-neutral-200 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full animate-pulse-modern"></div>
        </div>
      </div>
    </div>
  );
};
