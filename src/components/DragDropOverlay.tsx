/**
 * 拖拽提示覆盖层组件
 * 当用户拖拽文件到编辑区域时显示的提示界面
 * 提供视觉反馈和操作指引
 */

'use client';

import React from 'react';

/**
 * 拖拽提示覆盖层组件的属性接口
 */
export interface DragDropOverlayProps {
  /** 是否显示拖拽提示 */
  isDragOver: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 拖拽提示覆盖层组件
 * 在用户拖拽文件时显示友好的提示界面
 */
export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({
  isDragOver,
  className = ''
}) => {
  // 如果没有拖拽状态，不渲染任何内容
  if (!isDragOver) {
    return null;
  }

  return (
    <div className={`absolute inset-0 bg-primary-50/95 border-2 border-dashed border-primary-400 z-50 flex items-center justify-center transition-all duration-300 ease-in-out animate-fade-in backdrop-blur-sm ${className}`}>
      <div className="text-center">
        {/* 简洁的动画图标 */}
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg className="w-8 h-8 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        {/* 简洁的提示文字 */}
        <div className="text-xl font-bold text-primary-700 mb-3">
          拖拽内容到这里
        </div>

        {/* 支持格式说明 */}
        <div className="text-sm text-primary-600 bg-white/90 px-4 py-2 rounded-full">
          支持图片、文本内容、文本文件等
        </div>
      </div>
    </div>
  );
};
