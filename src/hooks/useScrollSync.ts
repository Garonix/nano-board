/**
 * 滚动同步 Hook
 * 处理 Markdown 分栏模式下的滚动同步功能
 *
 * 改进点：
 * 1. 增加节流机制防止频繁触发
 * 2. 改进防抖时间和同步逻辑
 * 3. 增加边界条件检查
 * 4. 添加内容变化时的同步重置
 */

import { useRef, useCallback, useEffect } from 'react';

/**
 * 节流函数 - 限制函数调用频率
 * @param func 要节流的函数
 * @param limit 节流时间间隔（毫秒）
 * @returns 节流后的函数
 */
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

/**
 * 滚动同步 Hook
 * @returns 滚动同步相关函数和引用
 */
export const useScrollSync = () => {
  // DOM 元素引用
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // 同步控制引用
  const scrollSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingSyncRef = useRef(false); // 防止滚动同步无限循环
  const lastSyncSourceRef = useRef<'editor' | 'preview' | null>(null); // 记录最后同步源
  const syncInProgressRef = useRef(false); // 标记同步是否正在进行

  /**
   * 安全的滚动比例计算
   * @param element 要计算的元素
   * @returns 滚动比例 (0-1)
   */
  const calculateScrollRatio = useCallback((element: HTMLElement): number => {
    const scrollTop = Math.max(0, element.scrollTop);
    const scrollHeight = Math.max(0, element.scrollHeight - element.clientHeight);

    // 边界条件检查：如果没有可滚动内容，返回 0
    if (scrollHeight <= 0) return 0;

    // 确保比例在 0-1 范围内
    return Math.min(1, Math.max(0, scrollTop / scrollHeight));
  }, []);

  /**
   * 安全的滚动位置设置
   * @param element 目标元素
   * @param ratio 滚动比例 (0-1)
   */
  const setScrollPosition = useCallback((element: HTMLElement, ratio: number) => {
    const scrollHeight = Math.max(0, element.scrollHeight - element.clientHeight);

    // 边界条件检查
    if (scrollHeight <= 0) return;

    const targetScrollTop = Math.min(scrollHeight, Math.max(0, scrollHeight * ratio));

    // 使用 requestAnimationFrame 确保 DOM 更新完成后再滚动
    requestAnimationFrame(() => {
      element.scrollTop = targetScrollTop;
    });
  }, []);

  /**
   * 通用滚动同步函数 - 改进版
   * @param sourceElement 源元素
   * @param targetElement 目标元素
   * @param source 同步源标识
   */
  const syncScroll = useCallback((
    sourceElement: HTMLElement,
    targetElement: HTMLElement,
    source: 'editor' | 'preview'
  ) => {
    // 防止无限循环和重复同步
    if (isScrollingSyncRef.current || syncInProgressRef.current) return;

    // 检查元素是否有效
    if (!sourceElement || !targetElement) return;

    try {
      syncInProgressRef.current = true;

      // 计算源元素的滚动比例
      const scrollRatio = calculateScrollRatio(sourceElement);

      // 设置同步标志，防止目标元素的滚动事件触发反向同步
      isScrollingSyncRef.current = true;
      lastSyncSourceRef.current = source;

      // 应用滚动位置到目标元素
      setScrollPosition(targetElement, scrollRatio);

      // 清除同步标志（使用更长的防抖时间确保稳定性）
      if (scrollSyncTimeoutRef.current) {
        clearTimeout(scrollSyncTimeoutRef.current);
      }

      scrollSyncTimeoutRef.current = setTimeout(() => {
        isScrollingSyncRef.current = false;
        lastSyncSourceRef.current = null;
        syncInProgressRef.current = false;
      }, 150); // 增加防抖时间到 150ms，提高稳定性

    } catch (error) {
      console.warn('滚动同步出错:', error);
      // 出错时重置状态
      isScrollingSyncRef.current = false;
      lastSyncSourceRef.current = null;
      syncInProgressRef.current = false;
    }
  }, [calculateScrollRatio, setScrollPosition]);

  // 使用节流的滚动同步函数，防止频繁调用
  const throttledSyncScroll = useCallback(
    throttle(syncScroll, 16), // 约 60fps 的更新频率
    [syncScroll]
  );

  /**
   * 从编辑器同步到预览区域
   */
  const syncScrollFromEditor = useCallback(() => {
    if (!editorRef.current || !previewRef.current) return;

    // 避免反向同步
    if (lastSyncSourceRef.current === 'preview') return;

    throttledSyncScroll(editorRef.current, previewRef.current, 'editor');
  }, [throttledSyncScroll]);

  /**
   * 从预览区域同步到编辑器
   */
  const syncScrollFromPreview = useCallback(() => {
    if (!editorRef.current || !previewRef.current) return;

    // 避免反向同步
    if (lastSyncSourceRef.current === 'editor') return;

    throttledSyncScroll(previewRef.current, editorRef.current, 'preview');
  }, [throttledSyncScroll]);

  /**
   * 重置滚动同步状态 - 在内容变化时调用
   */
  const resetScrollSync = useCallback(() => {
    isScrollingSyncRef.current = false;
    lastSyncSourceRef.current = null;
    syncInProgressRef.current = false;

    if (scrollSyncTimeoutRef.current) {
      clearTimeout(scrollSyncTimeoutRef.current);
      scrollSyncTimeoutRef.current = null;
    }
  }, []);

  /**
   * 清理函数
   */
  const cleanup = useCallback(() => {
    if (scrollSyncTimeoutRef.current) {
      clearTimeout(scrollSyncTimeoutRef.current);
      scrollSyncTimeoutRef.current = null;
    }
    isScrollingSyncRef.current = false;
    lastSyncSourceRef.current = null;
    syncInProgressRef.current = false;
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    editorRef,
    previewRef,
    syncScrollFromEditor,
    syncScrollFromPreview,
    resetScrollSync, // 新增：重置同步状态的函数
    cleanup
  };
};
