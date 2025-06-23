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
import { cn, isImageFile, fileToBase64 } from '@/lib/utils';
import { BoardEditorProps } from '@/types';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState('1');

  // 引用
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // 加载数据
  const loadData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/board?mode=normal');
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

  // 保存数据
  const saveData = async () => {
    const content = blocksToContent(blocks);
    if (!content.trim()) return;

    try {
      setIsSaving(true);
      await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mode: 'normal' }),
      });
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
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

      return newBlocks;
    });
  };

  // 清空所有内容
  const clearAllContent = () => {
    if (window.confirm('确定要清空所有内容吗？此操作无法撤销。')) {
      const newTextBlock: ContentBlock = {
        id: Date.now().toString(),
        type: 'text',
        content: ''
      };
      setBlocks([newTextBlock]);
      setFocusedBlockId(newTextBlock.id);
    }
  };

  // 删除空文本块（当不是唯一块时）
  const deleteEmptyTextBlock = (blockId: string) => {
    setBlocks(prev => {
      // 只有在有多个块且当前块为空时才删除
      if (prev.length <= 1) return prev;

      const block = prev.find(b => b.id === blockId);
      if (!block || block.type !== 'text' || block.content.trim()) return prev;

      return prev.filter(b => b.id !== blockId);
    });
  };

  // 在指定位置插入图片
  const insertImageAtBlock = (blockId: string, imageSrc: string, altText: string) => {
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

      return newBlocks;
    });
  };

  // 初始化
  useEffect(() => {
    loadData();

    // 加载保存的设置
    const savedMode = localStorage.getItem('nano-board-markdown-mode');
    const savedPreview = localStorage.getItem('nano-board-markdown-preview');
    if (savedMode) setIsMarkdownMode(savedMode === 'true');
    if (savedPreview) setShowMarkdownPreview(savedPreview === 'true');
  }, []);

  // 自动保存
  useEffect(() => {
    if (blocks.length > 0 && !isLoading) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(saveData, 1000);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
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

  // 处理图片粘贴
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

              // 在当前块位置插入图片
              insertImageAtBlock(blockId, imageSrc, altText);
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

            // 插入到当前焦点块
            insertImageAtBlock(focusedBlockId, imageSrc, altText);
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

  // 检查页面是否包含图片块
  const hasImageBlocks = blocks.some(block => block.type === 'image');

  // 自动调整文本框高度 - 优化即时切换
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement, content: string) => {
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









  // 处理键盘快捷键
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

    // Backspace 键处理：删除空文本块
    if (e.key === 'Backspace') {
      const textarea = e.target as HTMLTextAreaElement;
      const currentBlock = blocks.find(block => block.id === blockId);

      // 如果光标在开头且文本块为空，且不是唯一块，则删除该块
      if (textarea.selectionStart === 0 &&
          currentBlock &&
          currentBlock.type === 'text' &&
          !currentBlock.content.trim() &&
          blocks.length > 1) {
        e.preventDefault();
        deleteEmptyTextBlock(blockId);
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

  // 简单的Markdown组件
  const markdownComponents = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code(props: any) {
      const { inline, className, children, ...rest } = props;
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          className="rounded-lg shadow-sm border border-gray-200"
          {...rest}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={cn('bg-gray-100 px-2 py-1 rounded text-sm font-mono', className)} {...rest}>
          {children}
        </code>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    img(props: any) {
      const { src, alt, ...rest } = props;
      return (
        <div className="my-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full h-auto rounded-lg shadow-sm"
            style={{ maxHeight: '600px' }}
            {...rest}
          />
        </div>
      );
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
          {isUploadingImage && (
            <div className="flex items-center gap-2 text-orange-600">
              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">上传中...</span>
            </div>
          )}
          {isSaving && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">保存中...</span>
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

                      {/* 图片容器 - 优化为原图尺寸显示 */}
                      <div className="relative inline-block bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 max-w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={block.content}
                          alt={block.alt || '图片'}
                          className="max-w-full h-auto block"
                          style={{
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

        {/* Markdown模式 */}
        {isMarkdownMode && (
          <div className="flex w-full h-full">
            {/* 编辑区域 */}
            <div className={cn(
              'bg-white',
              showMarkdownPreview ? 'flex-1 border-r border-gray-200' : 'w-full'
            )}>
              <textarea
                value={blocksToContent(blocks)}
                onChange={(e) => {
                  const newBlocks = contentToBlocks(e.target.value);
                  setBlocks(newBlocks);
                }}
                onPaste={(e) => handlePaste(e, focusedBlockId)}
                onKeyDown={(e) => handleKeyDown(e, focusedBlockId)}
                className="w-full h-full p-8 border-none outline-none resize-none font-mono text-sm leading-relaxed bg-white"
                placeholder="开始输入Markdown内容，支持粘贴图片..."
                spellCheck={false}
              />
            </div>

            {/* 预览区域 */}
            {showMarkdownPreview && (
              <div className="flex-1 bg-gray-50">
                <div className="h-full overflow-auto p-8">
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
    </div>
  );
};
