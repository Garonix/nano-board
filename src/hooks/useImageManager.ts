/**
 * 图片管理 Hook
 * 统一处理图片上传、插入、缓存等功能
 */

import { useCallback, useRef } from 'react';
import { ContentBlock, ImageCacheItem } from '@/types';
import {
  isImageFile,
  fileToBase64,
  saveImagesToCache,
  loadImageCache,
  clearImageCache,
  removeImageFromCache,
  deleteImageFromServer,
  batchDeleteImagesFromServer
} from '@/lib/utils';

/**
 * 图片管理 Hook
 * @param blocks 当前内容块
 * @param setBlocks 设置内容块函数
 * @param isMarkdownMode 是否为 Markdown 模式
 * @param focusedBlockId 当前焦点块ID
 * @param contentToBlocks 内容转换函数
 * @param extractImagesFromBlocks 提取图片函数
 * @param setCachedImages 设置缓存图片函数
 * @param setIsUploadingImage 设置上传状态函数
 * @returns 图片管理相关函数
 */
export const useImageManager = (
  blocks: ContentBlock[],
  setBlocks: (blocks: ContentBlock[] | ((prev: ContentBlock[]) => ContentBlock[])) => void,
  isMarkdownMode: boolean,
  focusedBlockId: string,
  contentToBlocks: (content: string) => ContentBlock[],
  extractImagesFromBlocks: (blocks: ContentBlock[]) => Array<{id: string, src: string, alt: string}>,
  setCachedImages: (images: ImageCacheItem[]) => void,
  setIsUploadingImage: (loading: boolean) => void
) => {
  // 防抖定时器引用
  const localSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 保存图片到本地缓存（防抖处理）
  const saveImagesToCacheDebounced = useCallback(() => {
    if (localSaveTimeoutRef.current) {
      clearTimeout(localSaveTimeoutRef.current);
    }

    localSaveTimeoutRef.current = setTimeout(() => {
      const images = extractImagesFromBlocks(blocks);
      if (images.length > 0) {
        saveImagesToCache(images);
      }
    }, 2000); // 2秒防抖
  }, [blocks, extractImagesFromBlocks]);

  // 加载图片缓存
  const loadCachedImages = useCallback(() => {
    const items = loadImageCache();
    setCachedImages(items);
  }, [setCachedImages]);

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

    // 立即保存图片到缓存（Markdown模式）
    const images = extractImagesFromBlocks(newBlocks);
    if (images.length > 0) {
      saveImagesToCache(images);
      loadCachedImages(); // 刷新图片缓存列表
    }

    // 设置光标位置到换行符后，用户可以立即继续输入文本
    setTimeout(() => {
      const newCursorPos = start + imageMarkdown.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }, [contentToBlocks, setBlocks, extractImagesFromBlocks, loadCachedImages]);

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
      } finally {
        setIsUploadingImage(false);
      }
    }
  }, [uploadImage, insertImage, setIsUploadingImage]);

  // 从缓存中恢复图片到编辑器
  const restoreImageFromCache = useCallback((cacheItem: ImageCacheItem) => {
    insertImage(cacheItem.src, cacheItem.alt);
  }, [insertImage]);

  // 清除图片缓存
  const handleClearImageCache = useCallback(async (cachedImages: ImageCacheItem[]) => {
    if (window.confirm('确定要清除所有图片缓存吗？此操作将同时删除服务器上的图片文件，无法撤销。')) {
      try {
        // 获取所有缓存图片的URL
        const imageSrcs = cachedImages.map(item => item.src);

        // 批量删除服务器上的图片文件
        if (imageSrcs.length > 0) {
          const deleteResult = await batchDeleteImagesFromServer(imageSrcs);
          if (!deleteResult.success) {
            console.warn('部分服务器图片删除失败，但仍会清除本地缓存');
          }
        }

        // 清除本地缓存
        clearImageCache();
        setCachedImages([]);

        console.log('图片缓存清除完成');
      } catch (error) {
        console.error('清除图片缓存时发生错误:', error);
        // 即使服务器删除失败，也清除本地缓存
        clearImageCache();
        setCachedImages([]);
      }
    }
  }, [setCachedImages]);

  // 删除单个缓存图片
  const handleRemoveImageFromCache = useCallback(async (imageId: string, imageSrc: string) => {
    try {
      // 删除服务器上的图片文件
      const serverDeleteSuccess = await deleteImageFromServer(imageSrc);
      if (!serverDeleteSuccess) {
        console.warn('服务器图片删除失败，但仍会删除本地缓存');
      }

      // 删除本地缓存
      removeImageFromCache(imageId);
      loadCachedImages(); // 刷新缓存列表

      console.log('图片删除完成');
    } catch (error) {
      console.error('删除图片时发生错误:', error);
      // 即使服务器删除失败，也删除本地缓存
      removeImageFromCache(imageId);
      loadCachedImages();
    }
  }, [loadCachedImages]);

  return {
    saveImagesToCacheDebounced,
    loadCachedImages,
    insertImage,
    handleImagePaste,
    handleImageDrop,
    restoreImageFromCache,
    handleClearImageCache,
    handleRemoveImageFromCache
  };
};
