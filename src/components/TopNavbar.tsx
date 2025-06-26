/**
 * 顶部导航栏组件
 * 包含应用标题、模式切换、预览切换、清空、历史记录等功能按钮
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TopNavbarProps } from '@/types';

export const TopNavbar: React.FC<TopNavbarProps> = ({
  isMarkdownMode,
  showMarkdownPreview,
  isUploadingImage,
  fileHistoryLoadingState,
  onToggleMarkdownMode,
  onToggleMarkdownPreview,
  onClearAllContent,
  onToggleHistorySidebar
}) => {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Nano Board</h1>

        {/* 模式切换按钮 */}
        <button
          onClick={onToggleMarkdownMode}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            isMarkdownMode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          )}
        >
          {isMarkdownMode ? 'Markdown' : '普通文本'}
        </button>

        {/* Markdown 预览切换按钮 */}
        {isMarkdownMode && (
          <button
            onClick={onToggleMarkdownPreview}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              showMarkdownPreview
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            )}
          >
            {showMarkdownPreview ? '分栏预览' : '单栏编辑'}
          </button>
        )}

        {/* 清空按钮 */}
        <button
          onClick={onClearAllContent}
          className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-red-600 border border-red-300 hover:bg-red-50 hover:border-red-400"
          title="清空所有内容"
        >
          <span className="inline-flex items-center gap-1">
            <span>清空</span>
          </span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* 历史记录按钮 */}
        <button
          onClick={onToggleHistorySidebar}
          className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          title="查看历史记录"
          disabled={fileHistoryLoadingState.isLoading}
        >
          {fileHistoryLoadingState.isLoading ? '加载中...' : '历史'}
        </button>

        {/* 上传状态指示器 */}
        {isUploadingImage && (
          <div className="flex items-center gap-2 text-orange-600">
            <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">上传中...</span>
          </div>
        )}
      </div>
    </div>
  );
};
