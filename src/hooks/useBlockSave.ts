/**
 * 分块保存 Hook
 * 实现失焦保存机制，在用户离开文本框时触发保存操作
 */

import { useCallback, useRef } from 'react';
import { ContentBlock } from '@/types';

/**
 * 分块保存状态接口
 */
interface BlockSaveState {
  /** 保存状态提示的块ID */
  savingBlockId: string | null;
  /** 设置保存状态提示的块ID */
  setSavingBlockId: (blockId: string | null) => void;
}

/**
 * 失焦保存 Hook
 * @param isMarkdownMode 是否为Markdown模式
 * @param blocksToContent 内容转换函数
 * @param saveState 保存状态管理
 * @returns 失焦保存相关函数
 */
export const useBlockSave = (
  isMarkdownMode: boolean,
  blocksToContent: (blocks: ContentBlock[]) => string,
  saveState: BlockSaveState
) => {
  // 存储当前的blocks状态，用于失焦保存
  const currentBlocksRef = useRef<ContentBlock[]>([]);

  /**
   * 保存所有文本块（失焦时触发）
   * @param blocks 所有文本块
   * @param blockId 触发保存的文本块ID
   */
  const saveBlocks = useCallback(async (blocks: ContentBlock[], blockId: string) => {
    try {
      // 显示保存状态提示
      saveState.setSavingBlockId(blockId);

      const mode = isMarkdownMode ? 'markdown' : 'normal';
      const content = blocksToContent(blocks);

      if (!content.trim()) {
        saveState.setSavingBlockId(null);
        return;
      }

      await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mode }),
      });

      console.log(`文本块 ${blockId} 失焦保存完成`);

      // 3秒后隐藏保存状态提示
      setTimeout(() => {
        saveState.setSavingBlockId(null);
      }, 3000);

    } catch (error) {
      console.error(`保存文本块 ${blockId} 失败:`, error);
      // 出错时也要隐藏提示
      saveState.setSavingBlockId(null);
    }
  }, [isMarkdownMode, blocksToContent, saveState]);

  /**
   * 更新当前blocks状态
   * @param blocks 当前的文本块数组
   */
  const updateBlocks = useCallback((blocks: ContentBlock[]) => {
    currentBlocksRef.current = blocks;
  }, []);

  /**
   * 失焦保存指定文本块
   * @param blockId 文本块ID
   */
  const saveOnBlur = useCallback(async (blockId: string) => {
    const currentBlocks = currentBlocksRef.current;
    const targetBlock = currentBlocks.find(block => block.id === blockId);

    // 只保存文本类型的块
    if (!targetBlock || targetBlock.type !== 'text') {
      return;
    }

    // 如果内容为空，不进行保存
    if (!targetBlock.content.trim()) {
      return;
    }

    await saveBlocks(currentBlocks, blockId);
  }, [saveBlocks]);

  return {
    updateBlocks,
    saveOnBlur
  };
};
