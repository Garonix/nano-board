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
import { autoScrollToNewContent } from '@/lib/textareaUtils';

/**
 * 图片管理 Hook（简化版）
 * @param setBlocks 设置内容块函数
 * @param isMarkdownMode 是否为 Markdown 模式
 * @param contentToBlocks 内容转换函数
 * @param setIsUploadingImage 设置上传状态函数
 * @param refreshFileHistory 刷新文件历史函数
 * @param saveOnImageInsert 图片插入后的保存函数
 * @returns 图片管理相关函数
 */
export const useImageManager = (
  setBlocks: (blocks: ContentBlock[] | ((prev: ContentBlock[]) => ContentBlock[])) => void,
  isMarkdownMode: boolean,
  contentToBlocks: (content: string) => ContentBlock[],
  setIsUploadingImage: (loading: boolean) => void,
  refreshFileHistory?: () => Promise<void>,
  saveOnImageInsert?: (blockId: string) => Promise<void>
) => {

  // 注意：图片缓存功能已移除，统一使用文件系统扫描

  // 在Markdown模式下插入图片（添加立即保存机制）
  const insertImageInMarkdownMode = useCallback(async (imageSrc: string, altText: string) => {
    console.log('insertImageInMarkdownMode 被调用:', { imageSrc, altText });

    const textarea = document.querySelector('textarea[data-markdown-editor="true"]') as HTMLTextAreaElement;
    if (!textarea) {
      console.error('未找到markdown编辑器textarea');
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // 在当前光标位置创建新行并插入图片
    // 不管光标在哪里，都先插入换行符创建新行，然后插入图片，再添加空行
    const imageMarkdown = `\n![${altText}](${imageSrc})\n`;

    // 关键修改：不替换任何现有文本，即使有选中文本也保留
    // 始终在光标起始位置插入，保留所有原有文本
    const newValue = value.slice(0, start) + imageMarkdown + value.slice(start);

    // 更新React状态
    const newBlocks = contentToBlocks(newValue);
    setBlocks(newBlocks);

    // 设置光标位置到图片语法后的换行符后，用户可以立即继续输入文本
    setTimeout(() => {
      const newCursorPos = start + imageMarkdown.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
      console.log('光标已设置到位置:', newCursorPos);

      // Markdown模式下滚动到textarea的光标位置
      // 由于是在textarea内部，我们滚动到textarea元素本身
      autoScrollToNewContent('markdown-editor', 100);
    }, 0);

    // Markdown模式图片插入后立即触发保存
    if (saveOnImageInsert) {
      // 使用setTimeout确保状态更新完成后再保存
      setTimeout(async () => {
        await saveOnImageInsert('markdown-editor');
        console.log('Markdown模式图片插入后立即保存完成');
      }, 150); // 稍微延长时间确保DOM和状态都更新完成
    }
  }, [contentToBlocks, setBlocks, saveOnImageInsert]);

  // 在普通模式下将图片添加到页面末尾（优化空文本框处理）
  const insertImageAtEnd = useCallback(async (imageSrc: string, altText: string) => {
    const imageId = Date.now().toString();

    setBlocks(prev => {
      const newBlocks = [...prev];

      // 优化空文本框处理逻辑
      // 检查最后一个块是否为空文本框，如果是则删除
      if (newBlocks.length > 0) {
        const lastBlock = newBlocks[newBlocks.length - 1];
        if (lastBlock.type === 'text' &&
            (lastBlock.content === '' || lastBlock.content.trim() === '')) {
          console.log('删除末尾的空文本框，为图片插入做准备');
          newBlocks.pop();
        }
      }

      // 创建图片块
      const imageBlock: ContentBlock = {
        id: imageId,
        type: 'image',
        content: imageSrc,
        alt: altText
      };

      // 添加图片块
      newBlocks.push(imageBlock);
      console.log(`普通模式图片块已插入，ID: ${imageId}`);

      return newBlocks;
    });

    // 自动滚动到新插入的图片
    autoScrollToNewContent(imageId, 200);

    // 图片插入后立即触发保存
    if (saveOnImageInsert) {
      // 使用setTimeout确保状态更新完成后再保存
      setTimeout(async () => {
        await saveOnImageInsert(imageId);
      }, 100);
    }
  }, [setBlocks, saveOnImageInsert]);

  // 统一的图片插入函数（保存逻辑已在各自的插入函数中处理）
  const insertImage = useCallback(async (imageSrc: string, altText: string) => {
    if (isMarkdownMode) {
      await insertImageInMarkdownMode(imageSrc, altText);
    } else {
      await insertImageAtEnd(imageSrc, altText);
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
    console.log('handleImagePaste 被调用');

    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    console.log('粘贴项目:', items.map(item => item.type));
    console.log('图片项目数量:', imageItems.length);

    if (imageItems.length > 0) {
      e.preventDefault();
      setIsUploadingImage(true);

      try {
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file) {
            console.log('开始上传图片:', file.name, file.size);
            const imageSrc = await uploadImage(file);
            console.log('图片上传结果:', imageSrc);

            if (imageSrc) {
              const altText = file.name?.replace(/\.[^/.]+$/, "") || '图片';
              console.log('调用insertImage:', { imageSrc, altText });
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
