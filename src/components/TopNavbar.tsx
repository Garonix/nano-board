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
    <div className="flex items-center px-4 md:px-6 py-3 md:py-4 bg-surface-elevated border border-border rounded-lg mx-4 mt-4 mb-2 flex-shrink-0 backdrop-blur-sm mobile-nav-compact shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* 左侧：应用标题 */}
      <div className="flex items-center gap-2 md:gap-3">
        <h1 className="text-lg md:text-xl font-bold text-foreground tracking-tight hidden sm:block">Nano Board</h1>
      </div>

      {/* 中间：主要功能按钮组 - 居中对齐 */}
      <div className="flex-1 flex items-center justify-center gap-2 md:gap-3">
        {/* 现代化模式切换按钮 - 固定宽度防止抖动 */}
        <button
          onClick={onToggleMarkdownMode}
          className={cn(
            'w-24 md:w-28 px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-colors duration-200',
            isMarkdownMode
              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
              : 'bg-surface text-foreground border border-border hover:bg-neutral-50 hover:border-neutral-300'
          )}
        >
          <span className="flex items-center justify-center gap-1 md:gap-2">
            <span className="hidden sm:inline">{isMarkdownMode ? 'Markdown' : '普通文本'}</span>
            <span className="sm:hidden">{isMarkdownMode ? 'MD' : '文本'}</span>
          </span>
        </button>

        {/* 现代化Markdown预览切换按钮 - 固定宽度防止抖动 */}
        {isMarkdownMode && (
          <button
            onClick={onToggleMarkdownPreview}
            className={cn(
              'w-24 md:w-28 px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-colors duration-200',
              showMarkdownPreview
                ? 'bg-success-600 text-white hover:bg-success-700 shadow-sm'
                : 'bg-surface text-foreground border border-border hover:bg-neutral-50 hover:border-neutral-300'
            )}
          >
            <span className="flex items-center justify-center gap-1 md:gap-2">
              <span className={cn(
                'w-2 h-2 rounded-full transition-colors',
                showMarkdownPreview ? 'bg-primary-200' : 'bg-neutral-400'
              )}></span>
              <span className="hidden sm:inline">{showMarkdownPreview ? '分栏预览' : '单栏编辑'}</span>
              <span className="sm:hidden">{showMarkdownPreview ? '分栏' : '单栏'}</span>
            </span>
          </button>
        )}

        {/* 现代化清空按钮 */}
        <button
          onClick={onClearAllContent}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-red-500 text-white border border-red-500 hover:bg-red-600 hover:border-red-600 active:bg-red-700 shadow-sm hover:shadow-md"
          title="清空所有内容"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>清空</span>
          </span>
        </button>
      </div>

      {/* 右侧：历史按钮和状态指示器 */}
      <div className="flex items-center gap-4">
        {/* 现代化历史记录按钮 */}
        <button
          onClick={onToggleHistorySidebar}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-surface text-foreground border border-border hover:bg-neutral-50 hover:border-neutral-300',
            fileHistoryLoadingState.isLoading && 'opacity-75 cursor-not-allowed'
          )}
          title="查看历史记录"
          disabled={fileHistoryLoadingState.isLoading}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{fileHistoryLoadingState.isLoading ? '加载中...' : '历史'}</span>
          </span>
        </button>

        {/* 现代化上传状态指示器 */}
        {isUploadingImage && (
          <div className="flex items-center gap-3 px-4 py-2 bg-warning-50 border border-warning-200 rounded-lg animate-scale-fade-in">
            <div className="relative">
              <div className="w-4 h-4 border-2 border-warning-300 border-t-warning-600 rounded-full animate-spin-modern"></div>
            </div>
            <span className="text-sm font-medium text-warning-700">上传中...</span>
          </div>
        )}
      </div>
    </div>
  );
};
