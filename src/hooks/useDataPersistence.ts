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

  // 清空所有内容 - 同时清空对应的数据文件
  const clearAllContent = useCallback(async (clearAllBlocks: () => void) => {
    if (window.confirm('确定要清空所有内容吗？此操作将同时清空数据文件，无法撤销。')) {
      try {
        // 清空前端状态
        clearAllBlocks();

        // 清空对应模式的数据文件
        const mode = isMarkdownMode ? 'markdown' : 'normal';
        await fetch('/api/board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '', mode }),
        });

        console.log(`${mode === 'normal' ? '普通模式' : 'Markdown模式'}数据文件已清空`);
      } catch (error) {
        console.error('清空数据文件失败:', error);
        // 即使API调用失败，前端状态已经清空，不影响用户体验
      }
    }
  }, [isMarkdownMode]);

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
    clearAllContent,
    cleanup
  };
};
