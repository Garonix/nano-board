/**
 * 文件操作管理器组件
 * 负责处理所有文件相关的操作：保存、恢复、删除、清除等
 * 将文件操作逻辑从 BoardEditor 中分离出来，提高代码可维护性
 */

'use client';

import React, { useState } from 'react';
import { ContentBlock } from '@/types';
import { useTextManager } from '@/hooks/useTextManager';
import { useFileHistoryManager } from '@/hooks/useFileHistoryManager';
import { autoScrollToNewContent } from '@/lib/textareaUtils';

/**
 * 文件操作管理器组件的属性接口
 */
export interface FileOperationsManagerProps {
  // 编辑器状态
  isMarkdownMode: boolean;
  blocks: ContentBlock[];

  // 内容转换函数
  contentToBlocks: (content: string) => ContentBlock[];
  blocksToContent: (blocks: ContentBlock[]) => string;

  // 状态更新函数
  onSetBlocks: (blocks: ContentBlock[] | ((prev: ContentBlock[]) => ContentBlock[])) => void;
  onInsertTextContent: (content: string) => void;
  onCloseHistorySidebar: () => void;
  onRefreshFileHistory: () => Promise<void>;

  // 图片插入后立即保存函数
  saveOnImageInsert?: (blockId: string) => Promise<void>;

  // 子组件渲染函数 - 使用 render props 模式
  children: (operations: FileOperations) => React.ReactNode;
}

/**
 * 文件操作接口
 */
export interface FileOperations {
  // 文本操作
  handleSaveText: (content: string) => Promise<void>;
  handleRestoreLocalTextFile: (fileName: string) => Promise<void>;

  // 图片操作
  handleInsertLocalImageFile: (imagePath: string, fileName: string) => void;

  // 文件管理操作
  handleDeleteLocalFile: (fileName: string, fileType: 'image' | 'text') => Promise<void>;
  handleClearAllLocalFiles: (fileType: 'image' | 'text') => Promise<void>;

  // 状态
  isSavingText: boolean;
}

/**
 * 文件操作管理器组件
 * 使用 render props 模式，将操作函数传递给子组件
 */
export const FileOperationsManager: React.FC<FileOperationsManagerProps> = ({
  isMarkdownMode,
  // blocks, // 暂时未使用
  contentToBlocks,
  // blocksToContent, // 暂时未使用
  onSetBlocks,
  onInsertTextContent,
  onCloseHistorySidebar,
  onRefreshFileHistory,
  saveOnImageInsert,
  children
}) => {
  // 本地状态
  const [isSavingText, setIsSavingText] = useState(false);

  // 使用文本管理 Hook
  const { saveTextToFile } = useTextManager();

  // 使用文件历史管理 Hook（需要传入空函数，因为状态管理在父组件）
  const {
    getTextFileContent,
    deleteFile,
    clearAllFiles
  } = useFileHistoryManager(
    () => {}, // 空函数，状态管理在父组件
    () => {}, // 空函数，状态管理在父组件
    () => {}  // 空函数，状态管理在父组件
  );

  /**
   * 处理文本保存（移除alert提示）
   */
  const handleSaveText = async (content: string): Promise<void> => {
    if (!content.trim()) {
      console.warn('不能保存空白内容');
      return;
    }

    setIsSavingText(true);
    try {
      const success = await saveTextToFile(content);
      if (success) {
        console.log('文本保存成功');
        // 刷新文件历史
        await onRefreshFileHistory();
      } else {
        console.error('文本保存失败');
      }
    } catch (error) {
      console.error('保存文本时发生错误:', error);
    } finally {
      setIsSavingText(false);
    }
  };

  /**
   * 处理从本地文本文件恢复内容（修复光标位置插入）
   */
  const handleRestoreLocalTextFile = async (fileName: string): Promise<void> => {
    try {
      const content = await getTextFileContent(fileName);
      if (content) {
        // 统一使用 onInsertTextContent 函数，它会根据模式正确处理插入位置
        // 在普通模式下：智能插入内容（优先使用空文本框）
        // 在 Markdown 模式下：在当前光标位置插入内容
        onInsertTextContent(content);
        onCloseHistorySidebar();
        console.log(`文本文件恢复成功: ${fileName}`);
      } else {
        console.error(`无法读取本地文本文件内容: ${fileName}`);
      }
    } catch (error) {
      console.error('恢复本地文本文件时发生错误:', error);
    }
  };

  /**
   * 处理插入图片缓存（添加立即保存机制和优化空文本框处理）
   */
  const handleInsertLocalImageFile = (imagePath: string, fileName: string): void => {
    try {
      const altText = fileName.replace(/\.[^/.]+$/, ''); // 移除扩展名作为alt文本

      if (isMarkdownMode) {
        // 在Markdown模式下插入图片
        const textarea = document.querySelector('textarea[data-markdown-editor="true"]') as HTMLTextAreaElement;
        if (textarea) {
          const start = textarea.selectionStart;
          const value = textarea.value;

          // 在当前光标位置创建新行并插入图片
          // 不管光标在哪里，都先插入换行符创建新行，然后插入图片，再添加空行
          const imageMarkdown = `\n![${altText}](${imagePath})\n`;

          // 关键修改：不替换任何现有文本，即使有选中文本也保留
          // 始终在光标起始位置插入，保留所有原有文本
          const newValue = value.slice(0, start) + imageMarkdown + value.slice(start);

          // 更新React状态
          const newBlocks = contentToBlocks(newValue);
          onSetBlocks(newBlocks);

          // 设置光标位置到图片语法后的换行符后，用户可以立即继续输入文本
          setTimeout(() => {
            const newCursorPos = start + imageMarkdown.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
          }, 0);

          // Markdown模式图片插入后立即触发保存
          if (saveOnImageInsert) {
            // 使用setTimeout确保状态更新完成后再保存
            setTimeout(async () => {
              await saveOnImageInsert('markdown-editor');
              console.log('Markdown模式图片缓存插入后立即保存完成');
            }, 150); // 稍微延长时间确保DOM和状态都更新完成
          }
        }
      } else {
        // 在普通模式下插入图片到页面末尾（优化空文本框处理）
        const imageId = Date.now().toString();

        onSetBlocks(prev => {
          const newBlocks = [...prev];

          // 优化空文本框处理逻辑
          // 检查最后一个块是否为空文本框，如果是则删除
          if (newBlocks.length > 0) {
            const lastBlock = newBlocks[newBlocks.length - 1];
            if (lastBlock.type === 'text' &&
                (lastBlock.content === '' || lastBlock.content.trim() === '')) {
              console.log('删除末尾的空文本框，为图片缓存插入做准备');
              newBlocks.pop();
            }
          }

          // 创建图片块
          const imageBlock: ContentBlock = {
            id: imageId,
            type: 'image',
            content: imagePath,
            alt: altText
          };

          // 添加图片块
          newBlocks.push(imageBlock);
          console.log(`普通模式图片缓存块已插入，ID: ${imageId}`);

          return newBlocks;
        });

        // 自动滚动到新插入的图片缓存
        autoScrollToNewContent(imageId, 200);

        // 图片插入后立即触发保存
        if (saveOnImageInsert) {
          // 使用setTimeout确保状态更新完成后再保存
          setTimeout(async () => {
            await saveOnImageInsert(imageId);
            console.log('普通模式图片缓存插入后立即保存完成');
          }, 100);
        }
      }

      onCloseHistorySidebar();
      console.log(`图片缓存插入成功: ${fileName}`);
    } catch (error) {
      console.error('插入图片缓存时发生错误:', error);
    }
  };

  /**
   * 处理删除本地文件
   */
  const handleDeleteLocalFile = async (fileName: string, fileType: 'image' | 'text'): Promise<void> => {
    try {
      const success = await deleteFile(fileName, fileType);
      if (success) {
        // 刷新文件历史
        await onRefreshFileHistory();
        console.log(`${fileType === 'image' ? '图片' : '文本'}文件删除成功: ${fileName}`);
      } else {
        console.error(`${fileType === 'image' ? '图片' : '文本'}文件删除失败: ${fileName}`);
      }
    } catch (error) {
      console.error('删除本地文件时发生错误:', error);
    }
  };

  /**
   * 处理清除所有本地文件
   * 注意：确认逻辑由调用方（HistorySidebar）处理，避免重复确认
   */
  const handleClearAllLocalFiles = async (fileType: 'image' | 'text'): Promise<void> => {
    try {
      const success = await clearAllFiles(fileType);
      if (success) {
        // 刷新文件历史
        await onRefreshFileHistory();
        console.log(`所有${fileType === 'image' ? '图片' : '文本'}文件清除成功`);
      } else {
        console.error(`清除${fileType === 'image' ? '图片' : '文本'}文件失败`);
      }
    } catch (error) {
      console.error('清除本地文件时发生错误:', error);
    }
  };

  // 构建操作对象
  const operations: FileOperations = {
    handleSaveText,
    handleRestoreLocalTextFile,
    handleInsertLocalImageFile,
    handleDeleteLocalFile,
    handleClearAllLocalFiles,
    isSavingText
  };

  // 使用 render props 模式返回操作函数
  return <>{children(operations)}</>;
};
