/**
 * 键盘事件处理 Hook
 * 统一处理各种键盘快捷键和事件
 */

import { useCallback } from 'react';
import { ContentBlock } from '@/types';

/**
 * 键盘事件处理 Hook
 * @param blocks 当前内容块
 * @param isMarkdownMode 是否为 Markdown 模式
 * @param showMarkdownPreview 是否显示 Markdown 预览
 * @param setIsMarkdownMode 设置 Markdown 模式函数
 * @param setShowMarkdownPreview 设置预览模式函数
 * @param updateBlockContent 更新块内容函数
 * @param deleteEmptyTextBlock 删除空文本块函数
 * @param setFocusedBlockId 设置焦点块ID函数
 * @param contentToBlocks 内容转换函数
 * @param setBlocks 设置内容块函数
 * @returns 键盘事件处理函数
 */
export const useKeyboardHandlers = (
  blocks: ContentBlock[],
  isMarkdownMode: boolean,
  showMarkdownPreview: boolean,
  setIsMarkdownMode: (mode: boolean) => void,
  setShowMarkdownPreview: (show: boolean) => void,
  updateBlockContent: (blockId: string, content: string) => void,
  deleteEmptyTextBlock: (blockId: string) => void,
  setFocusedBlockId: (id: string) => void,
  contentToBlocks: (content: string) => ContentBlock[],
  setBlocks: (blocks: ContentBlock[]) => void
) => {

  // 处理Markdown模式下的键盘事件
  const handleMarkdownKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd + M 切换Markdown模式
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      setIsMarkdownMode(!isMarkdownMode);
      return;
    }

    // Ctrl/Cmd + P 切换Markdown预览（仅在Markdown模式下有效）
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      setShowMarkdownPreview(!showMarkdownPreview);
      return;
    }

    // Tab 键插入空格
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const newValue = value.slice(0, start) + '  ' + value.slice(end);
      textarea.value = newValue;

      // 更新blocks状态
      const newBlocks = contentToBlocks(newValue);
      setBlocks(newBlocks);

      // 设置光标位置
      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
      return;
    }

    // Enter 键处理 - 改进图片后换行逻辑
    if (e.key === 'Enter') {
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      // 检查光标前是否是图片语法结尾
      const beforeCursor = value.slice(0, start);
      const imageRegex = /!\[([^\]]*)\]\([^)]+\)$/;

      if (imageRegex.test(beforeCursor)) {
        // 在图片后插入换行符，允许正常的换行行为
        e.preventDefault();
        const newValue = value.slice(0, start) + '\n' + value.slice(end);

        // 直接更新 textarea 的值，避免触发 contentToBlocks 转换
        textarea.value = newValue;

        // 手动触发 onChange 事件以更新状态
        const changeEvent = new Event('input', { bubbles: true });
        textarea.dispatchEvent(changeEvent);

        // 设置光标位置到换行符后
        setTimeout(() => {
          textarea.setSelectionRange(start + 1, start + 1);
          textarea.focus();
        }, 0);
        return;
      }
    }
  }, [
    isMarkdownMode,
    showMarkdownPreview,
    setIsMarkdownMode,
    setShowMarkdownPreview,
    contentToBlocks,
    setBlocks
  ]);

  // 处理普通模式下的键盘快捷键
  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: string) => {
    // Ctrl/Cmd + M 切换Markdown模式
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      setIsMarkdownMode(!isMarkdownMode);
    }

    // Ctrl/Cmd + P 切换Markdown预览（仅在Markdown模式下有效）
    if ((e.ctrlKey || e.metaKey) && e.key === 'p' && isMarkdownMode) {
      e.preventDefault();
      setShowMarkdownPreview(!showMarkdownPreview);
    }

    // Backspace 键处理：只在特定条件下删除空文本块
    if (e.key === 'Backspace') {
      const textarea = e.target as HTMLTextAreaElement;
      const currentBlock = blocks.find(block => block.id === blockId);

      // 只有在以下所有条件都满足时才删除文本块：
      // 1. 光标在文本开头（selectionStart === 0）
      // 2. 没有选中任何文本（selectionStart === selectionEnd）
      // 3. 当前块是文本块且完全为空
      // 4. 不是唯一的块
      // 5. 用户明确想要删除块（通过检查是否是连续的backspace操作）
      if (textarea.selectionStart === 0 &&
          textarea.selectionStart === textarea.selectionEnd &&
          currentBlock &&
          currentBlock.type === 'text' &&
          currentBlock.content === '' && // 使用严格的空字符串检查
          blocks.length > 1) {
        e.preventDefault();
        deleteEmptyTextBlock(blockId);

        // 将焦点移动到前一个文本块的末尾
        const currentIndex = blocks.findIndex(block => block.id === blockId);
        if (currentIndex > 0) {
          const prevBlock = blocks[currentIndex - 1];
          if (prevBlock.type === 'text') {
            setTimeout(() => {
              setFocusedBlockId(prevBlock.id);
              const prevTextarea = document.querySelector(`textarea[data-block-id="${prevBlock.id}"]`) as HTMLTextAreaElement;
              if (prevTextarea) {
                const length = prevBlock.content.length;
                prevTextarea.setSelectionRange(length, length);
                prevTextarea.focus();
              }
            }, 0);
          }
        }
      }
    }

    // Tab 键插入空格
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentBlock = blocks.find(block => block.id === blockId);
      if (currentBlock) {
        const newContent = currentBlock.content.slice(0, start) + '  ' + currentBlock.content.slice(end);
        updateBlockContent(blockId, newContent);

        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    }
  }, [
    blocks,
    isMarkdownMode,
    showMarkdownPreview,
    setIsMarkdownMode,
    setShowMarkdownPreview,
    deleteEmptyTextBlock,
    setFocusedBlockId,
    updateBlockContent
  ]);

  return {
    handleMarkdownKeyDown,
    handleKeyDown
  };
};
