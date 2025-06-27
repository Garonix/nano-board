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
  fullScreen = true,
  size = 'medium'
}) => {
  // 根据大小设置动画尺寸
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4 border-2';
      case 'large':
        return 'w-12 h-12 border-4';
      case 'medium':
      default:
        return 'w-8 h-8 border-4';
    }
  };

  // 根据是否全屏设置容器样式
  const containerClasses = fullScreen
    ? 'min-h-screen bg-gray-50 flex items-center justify-center'
    : 'flex items-center justify-center p-4';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        {/* 旋转加载动画 */}
        <div 
          className={`${getSizeClasses()} border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4`}
          role="status"
          aria-label="加载中"
        />
        
        {/* 加载提示文字 */}
        <p className="text-gray-600 text-sm md:text-base">
          {message}
        </p>
      </div>
    </div>
  );
};
