/**
 * 简单白板编辑器
 * 普通模式：大文本框，支持文字和图片粘贴
 * Markdown模式：支持Markdown语法
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn, isImageFile, fileToBase64, saveImagesToCache, loadImageCache, clearImageCache, removeImageFromCache, deleteImageFromServer, batchDeleteImagesFromServer, formatTimestamp } from '@/lib/utils';
import { BoardEditorProps, ImageData, ImageCacheItem } from '@/types';

// 内容块类型
type ContentBlock = {
  id: string;
  type: 'text' | 'image';
  content: string; // 文本内容或图片URL
  alt?: string; // 图片alt文本
};

export const BoardEditor: React.FC<BoardEditorProps> = ({ className }) => {
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

  // 图片缓存相关状态
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [cachedImages, setCachedImages] = useState<ImageCacheItem[]>([]);

  // 引用
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Markdown分栏同步滚动相关引用
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingSyncRef = useRef(false); // 防止滚动同步无限循环

  // 将blocks转换为文本内容（用于保存）
  const blocksToContent = (blocks: ContentBlock[]): string => {
    return blocks.map(block => {
      if (block.type === 'text') {
        return block.content;
      } else {
        return isMarkdownMode
          ? `![${block.alt || '图片'}](${block.content})`
          : `[图片: ${block.alt || '图片'}](${block.content})`;
      }
    }).join('\n');
  };

  // 将文本内容转换为blocks（用于加载）
  const contentToBlocks = (content: string): ContentBlock[] => {
    if (!content.trim()) {
      return [{ id: '1', type: 'text', content: '' }];
    }

    const blocks: ContentBlock[] = [];
    let blockId = 1;

    // 简单的图片链接检测
    const lines = content.split('\n');
    let currentText = '';

    for (const line of lines) {
      // 检测Markdown图片语法
      const markdownImageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      // 检测普通图片语法
      const normalImageMatch = line.match(/^\[图片: ([^\]]+)\]\(([^)]+)\)$/);

      if (markdownImageMatch || normalImageMatch) {
        // 如果有累积的文本，先添加文本块
        if (currentText.trim()) {
          blocks.push({
            id: String(blockId++),
            type: 'text',
            content: currentText.trim()
          });
          currentText = '';
        }

        // 添加图片块
        const match = markdownImageMatch || normalImageMatch;
        blocks.push({
          id: String(blockId++),
          type: 'image',
          content: match![2],
          alt: match![1]
        });
      } else {
        currentText += (currentText ? '\n' : '') + line;
      }
    }

    // 添加剩余的文本
    if (currentText.trim() || blocks.length === 0) {
      blocks.push({
        id: String(blockId++),
        type: 'text',
        content: currentText
      });
    }

    return blocks;
  };

  // 提取当前blocks中的图片数据
  const extractImagesFromBlocks = (blocks: ContentBlock[]): ImageData[] => {
    return blocks
      .filter(block => block.type === 'image')
      .map(block => ({
        id: block.id,
        src: block.content,
        alt: block.alt || '图片'
      }));
  };

  // 保存图片到本地缓存（防抖处理）
  const saveImagesToCacheDebounced = () => {
    if (localSaveTimeoutRef.current) {
      clearTimeout(localSaveTimeoutRef.current);
    }

    localSaveTimeoutRef.current = setTimeout(() => {
      const images = extractImagesFromBlocks(blocks);
      if (images.length > 0) {
        saveImagesToCache(images);
      }
    }, 2000); // 2秒防抖
  };

  // 加载图片缓存
  const loadCachedImages = () => {
    const items = loadImageCache();
    setCachedImages(items);
  };

  // 从缓存中恢复图片到编辑器
  const restoreImageFromCache = (cacheItem: ImageCacheItem) => {
    if (isMarkdownMode) {
      // Markdown模式：在光标位置插入图片语法
      insertImageInMarkdownMode(cacheItem.src, cacheItem.alt);
    } else {
      // 普通模式：在当前焦点位置插入图片
      insertImageAtBlock(focusedBlockId, cacheItem.src, cacheItem.alt);
    }
    setShowHistorySidebar(false);
  };

  // 清除图片缓存
  const handleClearImageCache = async () => {
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
        setShowHistorySidebar(false);

        console.log('图片缓存清除完成');
      } catch (error) {
        console.error('清除图片缓存时发生错误:', error);
        // 即使服务器删除失败，也清除本地缓存
        clearImageCache();
        setCachedImages([]);
        setShowHistorySidebar(false);
      }
    }
  };

  // 删除单个缓存图片
  const handleRemoveImageFromCache = async (imageId: string, imageSrc: string) => {
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
  };

  // 加载数据 - 根据当前模式加载对应的数据文件
  const loadData = async () => {
    try {
      setIsLoading(true);
      const mode = isMarkdownMode ? 'markdown' : 'normal';
      const response = await fetch(`/api/board?mode=${mode}`);
      const data = await response.json();
      const loadedBlocks = contentToBlocks(data.content || '');
      setBlocks(loadedBlocks);
      setFocusedBlockId(loadedBlocks[0]?.id || '1');
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存数据 - 根据当前模式保存到对应的数据文件（静默保存）
  const saveData = async () => {
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
  };

  // 更新文本块内容
  const updateBlockContent = (blockId: string, content: string) => {
    setBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, content } : block
    ));
  };

  // 删除指定块
  const deleteBlock = (blockId: string) => {
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

      // 确保普通模式下末尾有文本框
      return ensureEndingTextBlock(newBlocks);
    });
  };

  // 清空所有内容 - 同时清空对应的数据文件
  const clearAllContent = async () => {
    if (window.confirm('确定要清空所有内容吗？此操作将同时清空数据文件，无法撤销。')) {
      try {
        // 清空前端状态
        const newTextBlock: ContentBlock = {
          id: Date.now().toString(),
          type: 'text',
          content: ''
        };
        setBlocks([newTextBlock]);
        setFocusedBlockId(newTextBlock.id);

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
  };

  // 确保普通模式下末尾始终有文本框
  const ensureEndingTextBlock = (blocks: ContentBlock[]): ContentBlock[] => {
    // 只在普通模式下执行此检查
    if (isMarkdownMode) return blocks;

    // 如果没有块或最后一个块不是文本块，添加文本块
    if (blocks.length === 0 || blocks[blocks.length - 1].type !== 'text') {
      const newTextBlock: ContentBlock = {
        id: Date.now().toString(),
        type: 'text',
        content: ''
      };
      return [...blocks, newTextBlock];
    }

    return blocks;
  };

  // 删除空文本块（当不是唯一块时）
  const deleteEmptyTextBlock = (blockId: string) => {
    setBlocks(prev => {
      // 只有在有多个块且当前块为空时才删除
      if (prev.length <= 1) return prev;

      const block = prev.find(b => b.id === blockId);
      if (!block || block.type !== 'text' || block.content.trim()) return prev;

      const newBlocks = prev.filter(b => b.id !== blockId);
      // 确保末尾有文本框
      return ensureEndingTextBlock(newBlocks);
    });
  };

  // Markdown分栏同步滚动功能
  const syncScrollFromEditor = () => {
    if (!editorRef.current || !previewRef.current || isScrollingSyncRef.current) return;

    const editor = editorRef.current;
    const preview = previewRef.current;

    // 计算编辑器的滚动比例
    const scrollTop = editor.scrollTop;
    const scrollHeight = editor.scrollHeight - editor.clientHeight;
    const scrollRatio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    // 应用到预览区域
    const previewScrollHeight = preview.scrollHeight - preview.clientHeight;
    const targetScrollTop = previewScrollHeight * scrollRatio;

    // 设置同步标志，防止无限循环
    isScrollingSyncRef.current = true;

    // 平滑滚动到目标位置
    preview.scrollTo({
      top: targetScrollTop,
      behavior: 'auto' // 使用auto而不是smooth，避免延迟
    });

    // 清除同步标志（使用防抖）
    if (scrollSyncTimeoutRef.current) {
      clearTimeout(scrollSyncTimeoutRef.current);
    }
    scrollSyncTimeoutRef.current = setTimeout(() => {
      isScrollingSyncRef.current = false;
    }, 50);
  };

  const syncScrollFromPreview = () => {
    if (!editorRef.current || !previewRef.current || isScrollingSyncRef.current) return;

    const editor = editorRef.current;
    const preview = previewRef.current;

    // 计算预览区域的滚动比例
    const scrollTop = preview.scrollTop;
    const scrollHeight = preview.scrollHeight - preview.clientHeight;
    const scrollRatio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    // 应用到编辑器
    const editorScrollHeight = editor.scrollHeight - editor.clientHeight;
    const targetScrollTop = editorScrollHeight * scrollRatio;

    // 设置同步标志，防止无限循环
    isScrollingSyncRef.current = true;

    // 平滑滚动到目标位置
    editor.scrollTo({
      top: targetScrollTop,
      behavior: 'auto' // 使用auto而不是smooth，避免延迟
    });

    // 清除同步标志（使用防抖）
    if (scrollSyncTimeoutRef.current) {
      clearTimeout(scrollSyncTimeoutRef.current);
    }
    scrollSyncTimeoutRef.current = setTimeout(() => {
      isScrollingSyncRef.current = false;
    }, 50);
  };

  // 在Markdown模式下插入图片
  const insertImageInMarkdownMode = (imageSrc: string, altText: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // 构建图片Markdown语法
    const imageMarkdown = `![${altText}](${imageSrc})`;

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

    // 设置光标位置到图片语法后
    setTimeout(() => {
      const newCursorPos = start + imageMarkdown.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  // 在普通模式下将图片添加到页面末尾
  const insertImageAtEnd = (imageSrc: string, altText: string) => {
    setBlocks(prev => {
      const newBlocks = [...prev];

      // 创建图片块
      const imageBlock: ContentBlock = {
        id: Date.now().toString(),
        type: 'image',
        content: imageSrc,
        alt: altText
      };

      // 创建新的文本块
      const newTextBlock: ContentBlock = {
        id: (Date.now() + 1).toString(),
        type: 'text',
        content: ''
      };

      // 将图片和文本块添加到末尾
      newBlocks.push(imageBlock, newTextBlock);

      // 设置焦点到新文本块
      setTimeout(() => setFocusedBlockId(newTextBlock.id), 0);

      return newBlocks;
    });
  };

  // 在指定位置插入图片（保留原函数用于兼容性，但在普通模式下重定向到末尾插入）
  const insertImageAtBlock = (blockId: string, imageSrc: string, altText: string) => {
    // 普通模式下统一将图片添加到末尾
    if (!isMarkdownMode) {
      insertImageAtEnd(imageSrc, altText);
      return;
    }

    // Markdown模式保持原有逻辑（实际上Markdown模式不会调用此函数）
    setBlocks(prev => {
      const blockIndex = prev.findIndex(block => block.id === blockId);
      if (blockIndex === -1) return prev;

      const currentBlock = prev[blockIndex];
      const newBlocks = [...prev];

      // 如果当前块有内容，需要分割
      if (currentBlock.content.trim()) {
        // 更新当前块（保留现有内容）
        newBlocks[blockIndex] = { ...currentBlock };

        // 插入图片块
        const imageBlock: ContentBlock = {
          id: Date.now().toString(),
          type: 'image',
          content: imageSrc,
          alt: altText
        };
        newBlocks.splice(blockIndex + 1, 0, imageBlock);

        // 插入新的文本块
        const newTextBlock: ContentBlock = {
          id: (Date.now() + 1).toString(),
          type: 'text',
          content: ''
        };
        newBlocks.splice(blockIndex + 2, 0, newTextBlock);

        // 设置焦点到新文本块
        setTimeout(() => setFocusedBlockId(newTextBlock.id), 0);
      } else {
        // 如果当前块为空，直接替换为图片
        const imageBlock: ContentBlock = {
          id: Date.now().toString(),
          type: 'image',
          content: imageSrc,
          alt: altText
        };
        newBlocks[blockIndex] = imageBlock;

        // 在图片后添加新文本块
        const newTextBlock: ContentBlock = {
          id: (Date.now() + 1).toString(),
          type: 'text',
          content: ''
        };
        newBlocks.splice(blockIndex + 1, 0, newTextBlock);

        // 设置焦点到新文本块
        setTimeout(() => setFocusedBlockId(newTextBlock.id), 0);
      }

      return ensureEndingTextBlock(newBlocks);
    });
  };

  // 初始化
  useEffect(() => {
    loadCachedImages(); // 加载图片缓存

    // 加载保存的设置
    const savedMode = localStorage.getItem('nano-board-markdown-mode');
    const savedPreview = localStorage.getItem('nano-board-markdown-preview');
    if (savedMode) setIsMarkdownMode(savedMode === 'true');
    if (savedPreview) setShowMarkdownPreview(savedPreview === 'true');
  }, []);

  // 当模式切换时重新加载对应的数据
  useEffect(() => {
    loadData();
  }, [isMarkdownMode]);

  // 处理点击外部区域关闭侧边栏
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showHistorySidebar && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setShowHistorySidebar(false);
      }
    };

    if (showHistorySidebar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistorySidebar]);

  // 自动保存
  useEffect(() => {
    if (blocks.length > 0 && !isLoading) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(saveData, 1000);

      // 同时触发图片缓存保存
      saveImagesToCacheDebounced();
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
      }
    };
  }, [blocks, isLoading]);

  // 保存设置
  useEffect(() => {
    localStorage.setItem('nano-board-markdown-mode', isMarkdownMode.toString());
  }, [isMarkdownMode]);

  useEffect(() => {
    localStorage.setItem('nano-board-markdown-preview', showMarkdownPreview.toString());
  }, [showMarkdownPreview]);

  // 处理图片粘贴 - 改进Markdown模式支持
  const handlePaste = async (e: React.ClipboardEvent, blockId: string) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      setIsUploadingImage(true);

      try {
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file && isImageFile(file)) {
            const base64 = await fileToBase64(file);

            const response = await fetch('/api/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageData: base64 }),
            });

            if (response.ok) {
              const result = await response.json();
              const imageSrc = `/api/images/${result.imagePath.replace('data/pics/', '')}`;
              const altText = file.name?.replace(/\.[^/.]+$/, "") || '图片';

              if (isMarkdownMode) {
                // Markdown模式：在光标位置插入图片语法
                insertImageInMarkdownMode(imageSrc, altText);
              } else {
                // 普通模式：在当前块位置插入图片
                insertImageAtBlock(blockId, imageSrc, altText);
              }
            }
          }
        }
      } catch (error) {
        console.error('图片上传失败:', error);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  // 拖拽状态管理 - 修复闪屏问题
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 清除可能存在的离开定时器
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    // 只有在状态改变时才更新，避免频繁重渲染
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 使用防抖机制，避免在子元素间移动时频繁触发
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragOver(false);
    }, 100);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 清除拖拽离开定时器并立即设置状态
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => isImageFile(file));

    if (imageFiles.length > 0) {
      setIsUploadingImage(true);

      try {
        for (const file of imageFiles) {
          const base64 = await fileToBase64(file);
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: base64 }),
          });

          if (response.ok) {
            const result = await response.json();
            const imageSrc = `/api/images/${result.imagePath.replace('data/pics/', '')}`;
            const altText = file.name.replace(/\.[^/.]+$/, "");

            if (isMarkdownMode) {
              // Markdown模式：在光标位置插入图片语法
              insertImageInMarkdownMode(imageSrc, altText);
            } else {
              // 普通模式：插入到当前焦点块
              insertImageAtBlock(focusedBlockId, imageSrc, altText);
            }
          }
        }
      } catch (error) {
        console.error('图片上传失败:', error);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  // 清理拖拽定时器
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  // 清理滚动同步定时器
  useEffect(() => {
    return () => {
      if (scrollSyncTimeoutRef.current) {
        clearTimeout(scrollSyncTimeoutRef.current);
      }
    };
  }, []);

  // 检查页面是否包含图片块
  const hasImageBlocks = blocks.some(block => block.type === 'image');

  // 自动调整文本框高度 - 优化即时切换
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement, _content: string) => {
    if (!hasImageBlocks) {
      // 页面中没有图片时，始终保持页面高度，无论是否有内容
      textarea.style.height = 'calc(100vh - 200px)';
      textarea.style.minHeight = 'calc(100vh - 200px)';
      textarea.style.maxHeight = 'calc(100vh - 200px)';
      textarea.style.transition = 'none'; // 禁用过渡动画确保即时切换
    } else {
      // 页面中有图片时，根据内容动态调整高度
      textarea.style.height = 'auto';
      textarea.style.minHeight = '2.5rem';
      textarea.style.maxHeight = 'none';
      textarea.style.transition = 'none'; // 禁用过渡动画确保即时切换
      const newHeight = Math.max(textarea.scrollHeight, 40);
      textarea.style.height = `${newHeight}px`;
    }
  };

  // 当图片状态改变时，立即更新所有文本框高度
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((textarea) => {
      const textareaElement = textarea as HTMLTextAreaElement;
      adjustTextareaHeight(textareaElement, textareaElement.value);
    });
  }, [hasImageBlocks]); // 依赖图片状态，确保即时更新









  // 处理Markdown模式下的键盘事件
  const handleMarkdownKeyDown = (e: React.KeyboardEvent) => {
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

        // 更新textarea值
        updateBlockContent('1', newValue); // Markdown模式只有一个文本块

        // 设置光标位置到换行符后
        setTimeout(() => {
          textarea.setSelectionRange(start + 1, start + 1);
          textarea.focus();
        }, 0);
        return;
      }
    }
  };

  // 处理普通模式下的键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent, blockId: string) => {
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
  };

  // 增强的Markdown组件配置 - 支持完整的Markdown语法
  const markdownComponents = {
    // 代码块和内联代码
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code(props: any) {
      const { inline, className, children, ...rest } = props;
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          className="rounded-lg shadow-sm border border-gray-200 my-4"
          {...rest}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={cn('bg-gray-100 px-2 py-1 rounded text-sm font-mono text-red-600', className)} {...rest}>
          {children}
        </code>
      );
    },

    // 图片组件 - 优化显示，不显示alt文本
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    img(props: any) {
      const { src, alt, ...rest } = props;
      return (
        <span className="inline-block my-6 text-center w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full h-auto rounded-lg shadow-sm block mx-auto"
            style={{
              maxHeight: '300px',
              objectFit: 'contain'
            }}
            {...rest}
          />
        </span>
      );
    },

    // 标题组件 - 确保正确渲染
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1(props: any) {
      return <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-8 pb-2 border-b border-gray-200" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2(props: any) {
      return <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-6 pb-1 border-b border-gray-100" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h3(props: any) {
      return <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-5" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h4(props: any) {
      return <h4 className="text-lg font-medium text-gray-700 mb-2 mt-4" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h5(props: any) {
      return <h5 className="text-base font-medium text-gray-700 mb-2 mt-3" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h6(props: any) {
      return <h6 className="text-sm font-medium text-gray-600 mb-2 mt-3" {...props} />;
    },

    // 段落组件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p(props: any) {
      const { children, ...rest } = props;

      // 检查子元素中是否包含图片
      const hasImage = React.Children.toArray(children).some((child: any) =>
        child?.type === 'img' ||
        (child?.props && child.props.src)
      );

      // 如果包含图片，使用div而不是p标签
      if (hasImage) {
        return <div className="mb-4" {...rest}>{children}</div>;
      }

      return <p className="mb-4 leading-relaxed text-gray-700" {...rest}>{children}</p>;
    },

    // 列表组件 - 确保正确渲染
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ul(props: any) {
      return <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ol(props: any) {
      return <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li(props: any) {
      return <li className="mb-1" {...props} />;
    },

    // 引用块
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockquote(props: any) {
      return (
        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 bg-blue-50 text-gray-700 italic" {...props} />
      );
    },

    // 表格组件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table(props: any) {
      return (
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full border border-gray-200 rounded-lg" {...props} />
        </div>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thead(props: any) {
      return <thead className="bg-gray-50" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    th(props: any) {
      return <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-200" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    td(props: any) {
      return <td className="px-4 py-2 text-gray-700 border-b border-gray-100" {...props} />;
    },

    // 水平分割线
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hr(props: any) {
      return <hr className="my-8 border-gray-300" {...props} />;
    },

    // 强调和加粗
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strong(props: any) {
      return <strong className="font-bold text-gray-900" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    em(props: any) {
      return <em className="italic text-gray-700" {...props} />;
    },

    // 链接
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a(props: any) {
      return (
        <a
          className="text-blue-600 hover:text-blue-800 underline"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        />
      );
    },

    // 删除线
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    del(props: any) {
      return <del className="line-through text-gray-500" {...props} />;
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-screen flex flex-col bg-white', className)}>
      {/* 简单的顶部工具栏 */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Nano Board</h1>

          <button
            onClick={() => setIsMarkdownMode(!isMarkdownMode)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              isMarkdownMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            )}
          >
            {isMarkdownMode ? 'Markdown' : '普通文本'}
          </button>

          {isMarkdownMode && (
            <button
              onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                showMarkdownPreview
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              )}
            >
              {showMarkdownPreview ? '分栏预览' : '单栏编辑'}
            </button>
          )}

          {/* 清空按钮 */}
          <button
            onClick={clearAllContent}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-red-600 border border-red-300 hover:bg-red-50 hover:border-red-400"
            title="清空所有内容"
          >
            <span className="inline-flex items-center gap-1">
              <span>清空</span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* 图片缓存按钮 */}
          <button
            onClick={() => {
              setShowHistorySidebar(!showHistorySidebar);
              if (!showHistorySidebar) {
                loadCachedImages(); // 打开时刷新图片缓存
              }
            }}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            title="查看图片缓存"
          >
            历史图片
          </button>

          {isUploadingImage && (
            <div className="flex items-center gap-2 text-orange-600">
              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">上传中...</span>
            </div>
          )}
        </div>
      </div>

      {/* 简单的主编辑区域 */}
      <div
        className="flex-1 flex overflow-hidden relative bg-white"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 拖拽提示 - 优化图标样式 */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-95 border-2 border-dashed border-blue-400 z-50 flex items-center justify-center transition-all duration-200 ease-in-out">
            <div className="text-center transform scale-105 transition-transform duration-200">
              <div className="text-6xl mb-4 animate-bounce text-blue-600">⬇</div>
              <div className="text-xl font-semibold text-blue-700 mb-2">拖拽图片到这里</div>
              <div className="text-sm text-blue-600 bg-white bg-opacity-80 px-3 py-1 rounded-full">
                支持 JPG、PNG、GIF、WebP 格式
              </div>
            </div>
          </div>
        )}

        {/* 普通模式：分块显示 */}
        {!isMarkdownMode && (
          <div className="w-full h-full overflow-auto p-2">
            <div className="max-w-none space-y-3">
              {blocks.map((block, index) => {
                return (
                  <div key={block.id} className="relative">
                    {block.type === 'text' ? (
                      <textarea
                        ref={(el) => {
                          if (el && focusedBlockId === block.id) {
                            // 当获得焦点时自动调整高度
                            setTimeout(() => {
                              adjustTextareaHeight(el, block.content);
                            }, 0);
                          }
                        }}
                        data-block-id={block.id}
                        value={block.content}
                        onChange={(e) => {
                          const newContent = e.target.value;
                          updateBlockContent(block.id, newContent);

                          // 智能调整高度
                          const target = e.target as HTMLTextAreaElement;
                          adjustTextareaHeight(target, newContent);
                        }}
                        onPaste={(e) => handlePaste(e, block.id)}
                        onKeyDown={(e) => handleKeyDown(e, block.id)}
                        onFocus={(e) => {
                          setFocusedBlockId(block.id);
                          // 聚焦时调整高度
                          const target = e.target as HTMLTextAreaElement;
                          setTimeout(() => {
                            adjustTextareaHeight(target, block.content);
                          }, 0);
                        }}
                        onBlur={() => {
                          // 失去焦点时立即保存图片到缓存
                          const images = extractImagesFromBlocks(blocks);
                          if (images.length > 0) {
                            saveImagesToCache(images);
                            loadCachedImages(); // 刷新图片缓存列表
                          }
                        }}
                        className={cn(
                          "w-full p-3 border rounded-lg outline-none resize-none font-mono text-sm leading-relaxed bg-white",
                          focusedBlockId === block.id
                            ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-20 shadow-sm"
                            : "border-gray-200 hover:border-gray-300",
                          !hasImageBlocks
                            ? "min-h-[calc(100vh-200px)]"
                            : "min-h-[2.5rem]"
                        )}
                        placeholder={
                          index === 0 && !block.content
                            ? "开始输入内容，支持粘贴或拖拽图片..."
                            : block.content
                            ? ""
                            : "继续输入..."
                        }
                        spellCheck={false}
                        style={{
                          height: !hasImageBlocks
                            ? 'calc(100vh - 200px)'
                            : 'auto',
                          minHeight: !hasImageBlocks
                            ? 'calc(100vh - 200px)'
                            : '2.5rem',
                          maxHeight: !hasImageBlocks
                            ? 'calc(100vh - 200px)'
                            : 'none',
                          overflow: 'hidden' // 彻底禁用滚动条
                        }}
                      />
                    ) : (
                    <div className="relative group w-full text-center my-4">
                      {/* 图片删除按钮 - 优化图标样式 */}
                      <button
                        onClick={() => deleteBlock(block.id)}
                        className="absolute top-3 right-3 z-10 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="删除图片"
                      >
                        <span className="text-xs font-bold">×</span>
                      </button>

                      {/* 图片容器 - 限制最大高度300px */}
                      <div className="relative inline-block bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 max-w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={block.content}
                          alt={block.alt || '图片'}
                          className="max-w-full h-auto block"
                          style={{
                            maxHeight: '300px',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain'
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const container = target.parentElement!;
                            container.innerHTML = `
                              <div class="p-8 text-center text-red-500 bg-red-50 min-w-[200px]">
                                <div class="text-2xl mb-3">⚠</div>
                                <div class="text-sm font-medium text-red-600">图片加载失败</div>
                                <div class="text-xs mt-2 text-red-400">请检查图片链接</div>
                              </div>
                            `;
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                );
              })}

            </div>
          </div>
        )}

        {/* Markdown模式 - 改进分栏布局和同步滚动 */}
        {isMarkdownMode && (
          <div className="flex w-full h-full">
            {/* 编辑区域 */}
            <div className={cn(
              'bg-white flex flex-col',
              showMarkdownPreview ? 'flex-1 border-r border-gray-200' : 'w-full'
            )}>
              <textarea
                ref={editorRef}
                value={blocksToContent(blocks)}
                onChange={(e) => {
                  const newBlocks = contentToBlocks(e.target.value);
                  setBlocks(newBlocks);
                }}
                onPaste={(e) => handlePaste(e, focusedBlockId)}
                onKeyDown={handleMarkdownKeyDown}
                onScroll={showMarkdownPreview ? syncScrollFromEditor : undefined}
                onBlur={() => {
                  // 失去焦点时立即保存图片到缓存
                  const images = extractImagesFromBlocks(blocks);
                  if (images.length > 0) {
                    saveImagesToCache(images);
                    loadCachedImages(); // 刷新图片缓存列表
                  }
                }}
                className="w-full h-full p-8 border-none outline-none resize-none font-mono text-sm leading-relaxed bg-white overflow-auto"
                placeholder="开始输入Markdown内容，支持粘贴图片..."
                spellCheck={false}
                style={{
                  minHeight: '100%',
                  height: '100%'
                }}
              />
            </div>

            {/* 预览区域 */}
            {showMarkdownPreview && (
              <div className="flex-1 bg-gray-50 flex flex-col">
                <div
                  ref={previewRef}
                  className="h-full overflow-auto p-8"
                  onScroll={syncScrollFromPreview}
                  style={{
                    minHeight: '100%',
                    height: '100%'
                  }}
                >
                  {blocksToContent(blocks).trim() ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                      className="prose prose-sm max-w-none prose-gray"
                    >
                      {blocksToContent(blocks)}
                    </ReactMarkdown>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      Markdown预览区域
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 图片缓存侧边栏 */}
      {showHistorySidebar && (
        <div ref={sidebarRef} className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right border-l border-gray-200">
          {/* 侧边栏头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">历史图片</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearImageCache}
                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                title="清除所有图片缓存"
              >
                清除缓存
              </button>
              <button
                onClick={() => setShowHistorySidebar(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                title="关闭"
              >
                ×
              </button>
            </div>
          </div>

          {/* 图片缓存列表 */}
          <div className="flex-1 overflow-auto p-4">
            {cachedImages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-4">🖼️</div>
                <p>暂无图片缓存</p>
                <p className="text-sm mt-2">上传图片后会自动保存到缓存</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cachedImages.map((image) => (
                  <div
                    key={image.id}
                    className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm hover:bg-blue-50 transition-all group"
                  >
                    {/* 图片项头部 */}
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                        {/* 从URL中提取文件名显示，如果没有则使用alt文本 */}
                        {image.src.split('/').pop()?.replace(/\.[^/.]+$/, '') || image.alt || '未命名图片'}
                      </h4>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTimestamp(image.timestamp)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImageFromCache(image.id, image.src);
                          }}
                          className="w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="删除此图片缓存"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* 图片预览 */}
                    <div className="mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-32 object-cover rounded border border-gray-200"
                      />
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => restoreImageFromCache(image)}
                        className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      >
                        插入到编辑器
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
