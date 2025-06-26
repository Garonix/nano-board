/**
 * 图片管理 Hook
 * 统一处理图片上传、插入、缓存等功能
 */

import { useCallback } from 'react';
import { ContentBlock } from '@/types';
import {
  isImageFile,
  fileToBase64
} from '@/lib/utils';

/**
 * 图片管理 Hook（简化版）
 * @param setBlocks 设置内容块函数
 * @param isMarkdownMode 是否为 Markdown 模式
 * @param contentToBlocks 内容转换函数
 * @param setIsUploadingImage 设置上传状态函数
 * @param refreshFileHistory 刷新文件历史函数
 * @returns 图片管理相关函数
 */
export const useImageManager = (
  setBlocks: (blocks: ContentBlock[] | ((prev: ContentBlock[]) => ContentBlock[])) => void,
  isMarkdownMode: boolean,
  contentToBlocks: (content: string) => ContentBlock[],
  setIsUploadingImage: (loading: boolean) => void,
  refreshFileHistory?: () => Promise<void>
) => {

  // 注意：图片缓存功能已移除，统一使用文件系统扫描

  // 在Markdown模式下插入图片
  const insertImageInMarkdownMode = useCallback((imageSrc: string, altText: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // 构建图片Markdown语法，自动添加两个空格和换行符以优化用户体验
    // 两个空格 + 换行符在Markdown中表示强制换行，让用户可以立即在下一行继续输入
    const imageMarkdown = `![${altText}](${imageSrc})  \n`;

    // 在光标位置插入图片语法
    const newValue = value.slice(0, start) + imageMarkdown + value.slice(end);

    // 更新blocks状态
    const newBlocks = contentToBlocks(newValue);
    setBlocks(newBlocks);

    // 图片已通过上传自动保存到文件系统，无需额外缓存操作

    // 设置光标位置到换行符后，用户可以立即继续输入文本
    setTimeout(() => {
      const newCursorPos = start + imageMarkdown.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }, [contentToBlocks, setBlocks]);

  // 在普通模式下将图片添加到页面末尾（不自动创建文本框）
  const insertImageAtEnd = useCallback((imageSrc: string, altText: string) => {
    setBlocks(prev => {
      const newBlocks = [...prev];

      // 检查并删除末尾的空文本框
      // 如果最后一个块是空的文本块，删除它以避免重复的空文本框
      if (newBlocks.length > 0) {
        const lastBlock = newBlocks[newBlocks.length - 1];
        if (lastBlock.type === 'text' &&
            (lastBlock.content === '' || lastBlock.content.trim() === '')) {
          // 删除空的文本框，为图片插入做准备
          newBlocks.pop();
        }
      }

      // 创建图片块
      const imageBlock: ContentBlock = {
        id: Date.now().toString(),
        type: 'image',
        content: imageSrc,
        alt: altText
      };

      // 只添加图片块，不再自动创建文本框
      // 用户需要通过"+"按钮手动创建新文本框
      newBlocks.push(imageBlock);

      return newBlocks;
    });
  }, [setBlocks]);

  // 统一的图片插入函数
  const insertImage = useCallback((imageSrc: string, altText: string) => {
    if (isMarkdownMode) {
      insertImageInMarkdownMode(imageSrc, altText);
    } else {
      insertImageAtEnd(imageSrc, altText);
    }
  }, [isMarkdownMode, insertImageInMarkdownMode, insertImageAtEnd]);

  // 处理图片上传
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!isImageFile(file)) return null;

    try {
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64 }),
      });

      if (response.ok) {
        const result = await response.json();
        return `/api/images/${result.imagePath.replace('data/pics/', '')}`;
      }
    } catch (error) {
      console.error('图片上传失败:', error);
    }
    return null;
  }, []);

  // 处理图片粘贴
  const handleImagePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      setIsUploadingImage(true);

      try {
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file) {
            const imageSrc = await uploadImage(file);
            if (imageSrc) {
              const altText = file.name?.replace(/\.[^/.]+$/, "") || '图片';
              insertImage(imageSrc, altText);
            }
          }
        }
      } finally {
        setIsUploadingImage(false);
      }
    }
  }, [uploadImage, insertImage, setIsUploadingImage]);

  // 处理图片拖拽
  const handleImageDrop = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(file => isImageFile(file));

    if (imageFiles.length > 0) {
      setIsUploadingImage(true);

      try {
        for (const file of imageFiles) {
          const imageSrc = await uploadImage(file);
          if (imageSrc) {
            const altText = file.name.replace(/\.[^/.]+$/, "");
            insertImage(imageSrc, altText);
          }
        }

        // 上传完成后刷新文件历史（如果提供了刷新函数）
        if (refreshFileHistory) {
          await refreshFileHistory();
        }
      } finally {
        setIsUploadingImage(false);
      }
    }
  }, [uploadImage, insertImage, setIsUploadingImage, refreshFileHistory]);

  return {
    insertImage,
    handleImagePaste,
    handleImageDrop
  };
};
