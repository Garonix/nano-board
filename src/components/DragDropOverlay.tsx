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
    <div className={`absolute inset-0 bg-blue-50 bg-opacity-95 border-2 border-dashed border-blue-400 z-50 flex items-center justify-center transition-all duration-200 ease-in-out ${className}`}>
      <div className="text-center transform scale-105 transition-transform duration-200">
        {/* 动画图标 */}
        <div className="text-6xl mb-4 animate-bounce text-blue-600">⬇</div>
        
        {/* 主要提示文字 */}
        <div className="text-xl font-semibold text-blue-700 mb-2">
          拖拽图片到这里
        </div>
        
        {/* 支持格式说明 */}
        <div className="text-sm text-blue-600 bg-white bg-opacity-80 px-3 py-1 rounded-full">
          支持 JPG、PNG、GIF、WebP 格式
        </div>
      </div>
    </div>
  );
};
