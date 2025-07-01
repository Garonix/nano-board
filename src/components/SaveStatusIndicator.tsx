/**
 * 保存状态提示组件
 * 在文本输入框右下角显示"已保存"提示，3秒后自动消失
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * 保存状态提示组件属性
 */
interface SaveStatusIndicatorProps {
  /** 是否显示保存状态 */
  isVisible: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 保存状态提示组件
 * @param props 组件属性
 * @returns JSX元素
 */
export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  isVisible,
  className
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        // 基础样式
        'absolute bottom-2 right-2 z-10',
        // 背景和边框
        'bg-green-100 border border-green-300 rounded-md',
        // 内边距和字体
        'px-2 py-1 text-xs text-green-700',
        // 阴影效果
        'shadow-sm',
        // 动画效果
        'animate-in fade-in-0 slide-in-from-bottom-1 duration-200',
        // 指针事件
        'pointer-events-none',
        className
      )}
    >
      已保存
    </div>
  );
};

/**
 * 带有绝对定位容器的保存状态提示组件
 * 用于在相对定位的父容器中显示提示
 */
interface SaveStatusContainerProps {
  /** 是否显示保存状态 */
  isVisible: boolean;
  /** 子元素 */
  children: React.ReactNode;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 保存状态容器组件
 * @param props 组件属性
 * @returns JSX元素
 */
export const SaveStatusContainer: React.FC<SaveStatusContainerProps> = ({
  isVisible,
  children,
  className
}) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      <SaveStatusIndicator isVisible={isVisible} />
    </div>
  );
};
