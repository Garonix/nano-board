/**
 * 编辑器状态管理 Hook
 * 统一管理编辑器的所有状态
 */

import { useState, useCallback } from 'react';
import { ContentBlock, EditorState, ImageCacheItem, TextHistoryItem, HistorySidebarType } from '@/types';

/**
 * 编辑器状态管理 Hook
 * @returns 编辑器状态和状态更新函数
 */
export const useEditorState = () => {
  // 基本状态
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { id: '1', type: 'text', content: '' }
  ]);
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState('1');

  // 历史侧边栏相关状态
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [historySidebarType, setHistorySidebarType] = useState<HistorySidebarType>('images');
  const [cachedImages, setCachedImages] = useState<ImageCacheItem[]>([]);
  const [textHistory, setTextHistory] = useState<TextHistoryItem[]>([]);

  // 更新文本块内容
  const updateBlockContent = useCallback((blockId: string, content: string) => {
    setBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, content } : block
    ));
  }, []);

  // 删除指定块
  const deleteBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      const blockIndex = prev.findIndex(block => block.id === blockId);
      if (blockIndex === -1) return prev;

      const newBlocks = [...prev];
      const deletedBlock = newBlocks[blockIndex];

      // 移除当前块
      newBlocks.splice(blockIndex, 1);

      // 如果删除的是图片块，尝试合并相邻的文本块
      if (deletedBlock.type === 'image') {
        const prevBlock = newBlocks[blockIndex - 1];
        const nextBlock = newBlocks[blockIndex]; // 注意：删除后索引已经变化

        if (prevBlock && nextBlock &&
            prevBlock.type === 'text' && nextBlock.type === 'text') {
          // 合并相邻的文本块
          const mergedContent = prevBlock.content +
            (prevBlock.content && nextBlock.content ? '\n' : '') +
            nextBlock.content;

          newBlocks[blockIndex - 1] = {
            ...prevBlock,
            content: mergedContent
          };
          newBlocks.splice(blockIndex, 1);

          // 设置焦点到合并后的文本块
          setTimeout(() => setFocusedBlockId(prevBlock.id), 0);
        } else if (prevBlock && prevBlock.type === 'text') {
          // 设置焦点到前一个文本块
          setTimeout(() => setFocusedBlockId(prevBlock.id), 0);
        } else if (nextBlock && nextBlock.type === 'text') {
          // 设置焦点到后一个文本块
          setTimeout(() => setFocusedBlockId(nextBlock.id), 0);
        }
      } else {
        // 删除文本块时，设置焦点到相邻块
        const remainingBlocks = newBlocks;
        if (remainingBlocks.length > 0) {
          const targetIndex = Math.min(blockIndex, remainingBlocks.length - 1);
          const targetBlock = remainingBlocks[targetIndex];
          if (targetBlock && targetBlock.type === 'text') {
            setTimeout(() => setFocusedBlockId(targetBlock.id), 0);
          }
        }
      }

      // 确保至少有一个文本块
      if (newBlocks.length === 0) {
        const newTextBlock: ContentBlock = {
          id: Date.now().toString(),
          type: 'text',
          content: ''
        };
        newBlocks.push(newTextBlock);
        setTimeout(() => setFocusedBlockId(newTextBlock.id), 0);
      }

      return newBlocks;
    });
  }, []);

  // 确保至少有一个文本块（仅在完全为空时）
  const ensureMinimumTextBlock = useCallback((blocks: ContentBlock[]): ContentBlock[] => {
    // 只在普通模式下执行此检查
    if (isMarkdownMode) return blocks;

    // 如果没有块，添加一个空文本块
    if (blocks.length === 0) {
      const newTextBlock: ContentBlock = {
        id: Date.now().toString(),
        type: 'text',
        content: ''
      };
      return [newTextBlock];
    }

    // 移除原有的强制末尾文本框逻辑，允许页面以图片块或非空文本框结尾
    return blocks;
  }, [isMarkdownMode]);

  // 删除空文本块（当不是唯一块时）
  const deleteEmptyTextBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      // 只有在有多个块且当前块为空时才删除
      if (prev.length <= 1) return prev;

      const block = prev.find(b => b.id === blockId);
      if (!block || block.type !== 'text' || block.content.trim()) return prev;

      const newBlocks = prev.filter(b => b.id !== blockId);
      // 确保至少有一个文本块
      return ensureMinimumTextBlock(newBlocks);
    });
  }, [ensureMinimumTextBlock]);

  // 添加新文本框到指定位置
  const addTextBlockAfter = useCallback((afterBlockId: string) => {
    setBlocks(prev => {
      const afterIndex = prev.findIndex(block => block.id === afterBlockId);
      if (afterIndex === -1) return prev;

      const newTextBlock: ContentBlock = {
        id: Date.now().toString(),
        type: 'text',
        content: ''
      };

      const newBlocks = [...prev];
      newBlocks.splice(afterIndex + 1, 0, newTextBlock);

      // 设置焦点到新文本框
      setTimeout(() => setFocusedBlockId(newTextBlock.id), 0);

      return newBlocks;
    });
  }, []);

  // 查找第一个空文本框
  const findFirstEmptyTextBlock = useCallback((blocks: ContentBlock[]): ContentBlock | null => {
    return blocks.find(block => block.type === 'text' && block.content.trim() === '') || null;
  }, []);

  // 智能插入文本内容（优先使用空文本框）
  const insertTextContent = useCallback((content: string) => {
    setBlocks(prev => {
      // 查找第一个空文本框
      const emptyTextBlock = findFirstEmptyTextBlock(prev);

      if (emptyTextBlock) {
        // 如果存在空文本框，直接填入内容
        const updatedBlocks = prev.map(block =>
          block.id === emptyTextBlock.id ? { ...block, content } : block
        );
        // 设置焦点到该文本框
        setTimeout(() => setFocusedBlockId(emptyTextBlock.id), 0);
        return updatedBlocks;
      } else {
        // 如果不存在空文本框，创建新的文本框
        const newTextBlock: ContentBlock = {
          id: Date.now().toString(),
          type: 'text',
          content
        };
        // 设置焦点到新文本框
        setTimeout(() => setFocusedBlockId(newTextBlock.id), 0);
        return [...prev, newTextBlock];
      }
    });
  }, [findFirstEmptyTextBlock]);

  // 清空指定文本框内容
  const clearTextBlockContent = useCallback((blockId: string) => {
    setBlocks(prev => prev.map(block =>
      block.id === blockId && block.type === 'text'
        ? { ...block, content: '' }
        : block
    ));
    // 设置焦点到清空的文本框
    setTimeout(() => setFocusedBlockId(blockId), 0);
  }, []);

  // 清空所有内容
  const clearAllBlocks = useCallback(() => {
    const newTextBlock: ContentBlock = {
      id: Date.now().toString(),
      type: 'text',
      content: ''
    };
    setBlocks([newTextBlock]);
    setFocusedBlockId(newTextBlock.id);
  }, []);

  // 处理模式切换后的状态同步
  const syncBlocksAfterModeSwitch = useCallback((newBlocks: ContentBlock[]) => {
    // 应用 ensureMinimumTextBlock 逻辑
    const syncedBlocks = ensureMinimumTextBlock(newBlocks);
    setBlocks(syncedBlocks);

    // 设置焦点到第一个文本块
    const firstTextBlock = syncedBlocks.find(block => block.type === 'text');
    if (firstTextBlock) {
      setFocusedBlockId(firstTextBlock.id);
    }
  }, [ensureMinimumTextBlock]);

  // 检查页面是否包含图片块
  const hasImageBlocks = blocks.some(block => block.type === 'image');

  // 组合状态对象
  const editorState: EditorState = {
    blocks,
    isMarkdownMode,
    showMarkdownPreview,
    isLoading,
    isUploadingImage,
    isDragOver,
    focusedBlockId,
    showHistorySidebar,
    historySidebarType,
    cachedImages,
    textHistory
  };

  return {
    // 状态
    editorState,
    hasImageBlocks,

    // 状态更新函数
    setBlocks,
    setIsMarkdownMode,
    setShowMarkdownPreview,
    setIsLoading,
    setIsUploadingImage,
    setIsDragOver,
    setFocusedBlockId,
    setShowHistorySidebar,
    setHistorySidebarType,
    setCachedImages,
    setTextHistory,

    // 业务逻辑函数
    updateBlockContent,
    deleteBlock,
    deleteEmptyTextBlock,
    clearAllBlocks,
    ensureMinimumTextBlock,
    syncBlocksAfterModeSwitch,

    // 新增的文本框管理函数
    addTextBlockAfter,
    findFirstEmptyTextBlock,
    insertTextContent,
    clearTextBlockContent
  };
};
