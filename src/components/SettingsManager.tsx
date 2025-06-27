/**
 * 设置管理器组件
 * 负责处理所有设置相关的操作：localStorage读写、模式切换、数据加载等
 * 将设置管理逻辑从 BoardEditor 中分离出来，提高代码可维护性
 */

'use client';

import React, { useEffect, useRef } from 'react';

/**
 * 设置管理器组件的属性接口
 */
export interface SettingsManagerProps {
  // 当前设置状态
  isMarkdownMode: boolean;
  showMarkdownPreview: boolean;

  // 设置更新函数
  onSetIsMarkdownMode: (value: boolean) => void;
  onSetShowMarkdownPreview: (value: boolean) => void;

  // 数据加载函数
  onLoadData: () => void;

  // 子组件渲染函数 - 使用 render props 模式
  children: React.ReactNode;
}

/**
 * 设置管理器组件
 * 负责处理所有与设置相关的逻辑，包括localStorage操作和模式切换
 */
export const SettingsManager: React.FC<SettingsManagerProps> = ({
  isMarkdownMode,
  showMarkdownPreview,
  onSetIsMarkdownMode,
  onSetShowMarkdownPreview,
  onLoadData,
  children
}) => {
  // 用于跟踪是否已经初始化
  const isInitializedRef = useRef(false);

  /**
   * 初始化设置 - 从localStorage加载保存的设置
   */
  useEffect(() => {
    if (isInitializedRef.current) return; // 防止重复初始化

    // 加载保存的设置
    const savedMode = localStorage.getItem('nano-board-markdown-mode');
    const savedPreview = localStorage.getItem('nano-board-markdown-preview');

    if (savedMode) {
      onSetIsMarkdownMode(savedMode === 'true');
    }
    if (savedPreview) {
      onSetShowMarkdownPreview(savedPreview === 'true');
    }

    // 标记为已初始化
    isInitializedRef.current = true;

    // 初始化完成后加载数据
    onLoadData();
  }, []); // 空依赖数组，只在组件挂载时执行一次

  /**
   * 当模式切换时重新加载对应的数据（排除初始化）
   */
  useEffect(() => {
    // 只有在已经初始化后才重新加载数据
    if (isInitializedRef.current) {
      onLoadData();
    }
  }, [isMarkdownMode]); // 只依赖 isMarkdownMode，移除 onLoadData 依赖

  /**
   * 保存Markdown模式设置到localStorage
   */
  useEffect(() => {
    localStorage.setItem('nano-board-markdown-mode', isMarkdownMode.toString());
  }, [isMarkdownMode]);

  /**
   * 保存Markdown预览设置到localStorage
   */
  useEffect(() => {
    localStorage.setItem('nano-board-markdown-preview', showMarkdownPreview.toString());
  }, [showMarkdownPreview]);

  // 直接渲染子组件，设置管理通过useEffect在后台进行
  return <>{children}</>;
};
