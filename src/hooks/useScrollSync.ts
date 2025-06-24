/**
 * 滚动同步 Hook
 * 处理 Markdown 分栏模式下的滚动同步功能
 */

import { useRef, useCallback } from 'react';

/**
 * 滚动同步 Hook
 * @returns 滚动同步相关函数和引用
 */
export const useScrollSync = () => {
  // 引用
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingSyncRef = useRef(false); // 防止滚动同步无限循环

  // 通用滚动同步函数
  const syncScroll = useCallback((
    sourceElement: HTMLElement,
    targetElement: HTMLElement
  ) => {
    if (isScrollingSyncRef.current) return;

    // 计算源元素的滚动比例
    const scrollTop = sourceElement.scrollTop;
    const scrollHeight = sourceElement.scrollHeight - sourceElement.clientHeight;
    const scrollRatio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    // 应用到目标元素
    const targetScrollHeight = targetElement.scrollHeight - targetElement.clientHeight;
    const targetScrollTop = targetScrollHeight * scrollRatio;

    // 设置同步标志，防止无限循环
    isScrollingSyncRef.current = true;

    // 平滑滚动到目标位置
    targetElement.scrollTo({
      top: targetScrollTop,
      behavior: 'auto' // 使用auto而不是smooth，避免延迟
    });

    // 清除同步标志（使用防抖）
    if (scrollSyncTimeoutRef.current) {
      clearTimeout(scrollSyncTimeoutRef.current);
    }
    scrollSyncTimeoutRef.current = setTimeout(() => {
      isScrollingSyncRef.current = false;
    }, 50);
  }, []);

  // 从编辑器同步到预览区域
  const syncScrollFromEditor = useCallback(() => {
    if (!editorRef.current || !previewRef.current) return;
    syncScroll(editorRef.current, previewRef.current);
  }, [syncScroll]);

  // 从预览区域同步到编辑器
  const syncScrollFromPreview = useCallback(() => {
    if (!editorRef.current || !previewRef.current) return;
    syncScroll(previewRef.current, editorRef.current);
  }, [syncScroll]);

  // 清理函数
  const cleanup = useCallback(() => {
    if (scrollSyncTimeoutRef.current) {
      clearTimeout(scrollSyncTimeoutRef.current);
    }
  }, []);

  return {
    editorRef,
    previewRef,
    syncScrollFromEditor,
    syncScrollFromPreview,
    cleanup
  };
};
