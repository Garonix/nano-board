/**
 * 保存状态提示组件
 * 在文本输入框右下角显示"已保存"提示，支持淡入淡出动画效果
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * 保存状态提示组件属性
 */
interface SaveStatusIndicatorProps {
  /** 是否显示保存状态 */
  isVisible: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 显示持续时间（毫秒），默认3000ms */
  duration?: number;
}

/**
 * 保存状态提示组件
 * @param props 组件属性
 * @returns JSX元素
 */
export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  isVisible,
  className,
  duration = 3000
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // 显示时立即渲染并开始淡入动画
      setShouldRender(true);
      setIsAnimatingOut(false);

      // 设置自动隐藏定时器
      const hideTimer = setTimeout(() => {
        setIsAnimatingOut(true);

        // 淡出动画完成后移除元素
        setTimeout(() => {
          setShouldRender(false);
          setIsAnimatingOut(false);
        }, 200); // 与淡出动画时长保持一致
      }, duration);

      return () => clearTimeout(hideTimer);
    } else {
      // 外部控制隐藏时立即开始淡出
      if (shouldRender) {
        setIsAnimatingOut(true);
        const removeTimer = setTimeout(() => {
          setShouldRender(false);
          setIsAnimatingOut(false);
        }, 200);

        return () => clearTimeout(removeTimer);
      }
    }
  }, [isVisible, duration, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={cn(
        // 基础样式
        'absolute bottom-2 right-0.5 z-10',
        // 背景和边框
        'bg-green-100 border border-green-300 rounded-md',
        // 内边距和字体
        'px-2 py-1 text-xs text-green-700',
        // 阴影效果
        'shadow-sm',
        // 动画效果 - 根据状态选择淡入或淡出
        isAnimatingOut
          ? 'animate-fade-out'
          : 'animate-scale-fade-in',
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
  /** 显示持续时间（毫秒），默认3000ms */
  duration?: number;
}

/**
 * 保存状态容器组件
 * @param props 组件属性
 * @returns JSX元素
 */
export const SaveStatusContainer: React.FC<SaveStatusContainerProps> = ({
  isVisible,
  children,
  className,
  duration
}) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      <SaveStatusIndicator isVisible={isVisible} duration={duration} />
    </div>
  );
};
