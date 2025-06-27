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
  blocks,
  contentToBlocks,
  blocksToContent,
  onSetBlocks,
  onInsertTextContent,
  onCloseHistorySidebar,
  onRefreshFileHistory,
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
   * 处理从本地文本文件恢复内容（移除alert提示）
   */
  const handleRestoreLocalTextFile = async (fileName: string): Promise<void> => {
    try {
      const content = await getTextFileContent(fileName);
      if (content) {
        // 在普通模式下，智能插入内容（优先使用空文本框）
        if (!isMarkdownMode) {
          onInsertTextContent(content);
        } else {
          // 在Markdown模式下，将内容添加到编辑器
          const newBlocks = contentToBlocks(blocksToContent(blocks) + '\n\n' + content);
          onSetBlocks(newBlocks);
        }
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
   * 处理插入图片缓存
   */
  const handleInsertLocalImageFile = (imagePath: string, fileName: string): void => {
    try {
      const altText = fileName.replace(/\.[^/.]+$/, ''); // 移除扩展名作为alt文本

      if (isMarkdownMode) {
        // 在Markdown模式下插入图片
        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const value = textarea.value;

          const imageMarkdown = `![${altText}](${imagePath})  \n`;
          const newValue = value.slice(0, start) + imageMarkdown + value.slice(end);

          const newBlocks = contentToBlocks(newValue);
          onSetBlocks(newBlocks);

          // 设置光标位置
          setTimeout(() => {
            const newCursorPos = start + imageMarkdown.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
          }, 0);
        }
      } else {
        // 在普通模式下插入图片到页面末尾
        const newImageBlock = {
          id: Date.now().toString(),
          type: 'image' as const,
          content: imagePath,
          alt: altText
        };
        onSetBlocks((prev: ContentBlock[]) => [...prev, newImageBlock]);
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
   */
  const handleClearAllLocalFiles = async (fileType: 'image' | 'text'): Promise<void> => {
    // 保留危险操作的确认提示
    if (!window.confirm(`确定要删除所有${fileType === 'image' ? '图片' : '文本'}文件吗？此操作无法撤销。`)) {
      return;
    }

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
