/**
 * 数据持久化 Hook
 * 处理数据的加载和保存功能
 */

import { useCallback, useRef } from 'react';
import { ContentBlock } from '@/types';

/**
 * 数据持久化 Hook
 * @param isMarkdownMode 是否为 Markdown 模式
 * @param blocksToContent 内容转换函数
 * @param contentToBlocks 内容转换函数
 * @param setBlocks 设置内容块函数
 * @param setFocusedBlockId 设置焦点块ID函数
 * @param setIsLoading 设置加载状态函数
 * @returns 数据持久化相关函数
 */
export const useDataPersistence = (
  isMarkdownMode: boolean,
  blocksToContent: (blocks: ContentBlock[]) => string,
  contentToBlocks: (content: string) => ContentBlock[],
  setBlocks: (blocks: ContentBlock[]) => void,
  setFocusedBlockId: (id: string) => void,
  setIsLoading: (loading: boolean) => void
) => {
  // 自动保存定时器引用
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 加载数据 - 根据当前模式加载对应的数据文件
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const mode = isMarkdownMode ? 'markdown' : 'normal';
      const response = await fetch(`/api/board?mode=${mode}`);
      const data = await response.json();

      // 调用contentToBlocks转换数据
      const loadedBlocks = contentToBlocks(data.content || '');

      // 直接设置blocks
      setBlocks(loadedBlocks);

      // 设置焦点到第一个文本块
      const firstTextBlock = loadedBlocks.find(block => block.type === 'text');
      if (firstTextBlock) {
        setFocusedBlockId(firstTextBlock.id);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isMarkdownMode, contentToBlocks, setBlocks, setFocusedBlockId, setIsLoading]);

  // 保存数据 - 根据当前模式保存到对应的数据文件（静默保存）
  const saveData = useCallback(async (blocks: ContentBlock[]) => {
    const content = blocksToContent(blocks);
    if (!content.trim()) return;

    try {
      const mode = isMarkdownMode ? 'markdown' : 'normal';
      await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mode }),
      });
    } catch (error) {
      console.error('保存失败:', error);
    }
  }, [isMarkdownMode, blocksToContent]);

  // 防抖保存
  const debouncedSave = useCallback((blocks: ContentBlock[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => saveData(blocks), 1000);
  }, [saveData]);

  // 注意：clearAllContent 函数已被移除，因为现在使用 BoardEditor 中的现代化确认对话框实现

  // 清理函数
  const cleanup = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, []);

  return {
    loadData,
    saveData,
    debouncedSave,
    cleanup
  };
};
