/**
 * 拖拽处理 Hook
 * 处理图片拖拽上传功能
 */

import { useCallback, useRef } from 'react';

/**
 * 拖拽处理 Hook
 * @param isDragOver 是否正在拖拽
 * @param setIsDragOver 设置拖拽状态函数
 * @param handleImageDrop 处理图片拖拽函数
 * @returns 拖拽事件处理函数
 */
export const useDragAndDrop = (
  isDragOver: boolean,
  setIsDragOver: (dragOver: boolean) => void,
  handleImageDrop: (files: File[]) => Promise<void>
) => {
  // 拖拽状态管理 - 修复闪屏问题
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 清除可能存在的离开定时器
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    // 只有在状态改变时才更新，避免频繁重渲染
    if (!isDragOver) {
      setIsDragOver(true);
    }
  }, [isDragOver, setIsDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 使用防抖机制，避免在子元素间移动时频繁触发
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragOver(false);
    }, 100);
  }, [setIsDragOver]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 清除拖拽离开定时器并立即设置状态
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    await handleImageDrop(files);
  }, [setIsDragOver, handleImageDrop]);

  // 清理函数
  const cleanup = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
  }, []);

  return {
    handleDragOver,
    handleDragLeave,
    handleDrop,
    cleanup
  };
};
