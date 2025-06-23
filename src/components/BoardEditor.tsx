/**
 * 白板编辑器组件
 * 支持普通模式和Markdown模式的完全独立数据存储
 * 实现模式隔离和优化的图片处理性能
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn, isImageFile, fileToBase64 } from '@/lib/utils';
import { BoardMode, ImageData, BoardEditorProps } from '@/types';

export const BoardEditor: React.FC<BoardEditorProps> = ({ className }) => {
  // === 模式状态管理 ===
  const [isMarkdownMode, setIsMarkdownMode] = useState(false); // 默认为普通模式
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false); // 控制Markdown分栏显示

  // === 普通模式独立状态 ===
  const [normalContent, setNormalContent] = useState('');
  const [normalImages, setNormalImages] = useState<ImageData[]>([]);

  // === Markdown模式独立状态 ===
  const [markdownContent, setMarkdownContent] = useState('');

  // === 通用状态 ===
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false); // 拖拽状态

  // === 引用管理 ===
  const dragLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 拖拽离开防抖定时器
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const renderContainerRef = useRef<HTMLDivElement>(null); // 普通模式渲染容器引用
  const [scrollTop, setScrollTop] = useState(0); // 滚动位置状态
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // === 计算当前模式的内容和图片 ===
  // 根据当前模式返回对应的内容和图片数据
  const currentContent = isMarkdownMode ? markdownContent : normalContent;
  const currentImages = isMarkdownMode ? [] : normalImages; // Markdown模式不使用独立的图片数组

  // === 内容更新函数 ===
  // 根据当前模式更新对应的内容
  const setCurrentContent = useCallback((newContent: string) => {
    if (isMarkdownMode) {
      setMarkdownContent(newContent);
    } else {
      setNormalContent(newContent);
    }
  }, [isMarkdownMode]);

  // 根据当前模式更新对应的图片数组（仅普通模式）
  const setCurrentImages = useCallback((newImages: ImageData[] | ((prev: ImageData[]) => ImageData[])) => {
    if (!isMarkdownMode) {
      setNormalImages(newImages);
    }
  }, [isMarkdownMode]);

  // 生成唯一ID - 确保稳定的函数引用
  const generateId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }, []); // 保持空依赖数组，确保函数引用稳定

  // 解析内容，提取图片和纯文本 - 修复无限循环问题
  const parseContent = useCallback((rawContent: string) => {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const foundImages: ImageData[] = [];
    let cleanContent = rawContent;
    let match;

    // 重置正则表达式的lastIndex
    imageRegex.lastIndex = 0;

    // 提取所有图片，并替换为占位符
    while ((match = imageRegex.exec(rawContent)) !== null) {
      const [fullMatch, alt, src] = match;

      foundImages.push({
        id: generateId(),
        src,
        alt
      });

      // 将Markdown图片语法替换为占位符
      const placeholder = `[图片: ${alt}]`;
      cleanContent = cleanContent.replace(fullMatch, placeholder);
    }

    return { cleanContent, images: foundImages };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 故意移除generateId依赖，避免无限循环

  // 加载初始内容和模式设置
  useEffect(() => {
    loadInitialData();

    // 加载保存的模式设置
    const savedMode = localStorage.getItem('nano-board-markdown-mode');
    const savedPreview = localStorage.getItem('nano-board-markdown-preview');
    if (savedMode !== null) {
      setIsMarkdownMode(savedMode === 'true');
    }
    if (savedPreview !== null) {
      setShowMarkdownPreview(savedPreview === 'true');
    }

    // 清理函数 - 清除拖拽定时器
    return () => {
      if (dragLeaveTimeoutRef.current) {
        clearTimeout(dragLeaveTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 故意不包含loadInitialData，避免无限循环

  // 模式切换时保存当前模式数据并加载新模式数据
  useEffect(() => {
    if (!isLoading) {
      // 保存当前模式的数据
      const currentMode: BoardMode = isMarkdownMode ? 'markdown' : 'normal';
      const previousMode: BoardMode = isMarkdownMode ? 'normal' : 'markdown';

      // 保存之前模式的数据
      saveModeContent(previousMode);

      // 加载新模式的数据
      loadModeContent(currentMode);
    }

    // 保存模式设置到localStorage
    localStorage.setItem('nano-board-markdown-mode', isMarkdownMode.toString());
  }, [isMarkdownMode]);

  // 保存预览设置
  useEffect(() => {
    localStorage.setItem('nano-board-markdown-preview', showMarkdownPreview.toString());
  }, [showMarkdownPreview]);

  // 合并内容和图片为完整内容（用于保存）- 确保稳定的函数引用
  const combineContentWithImages = useCallback((textContent: string, imageList: ImageData[]) => {
    if (imageList.length === 0) return textContent;

    let combinedContent = textContent;

    // 将占位符替换为Markdown语法
    imageList.forEach(image => {
      const placeholder = `[图片: ${image.alt}]`;
      const imageMarkdown = `![${image.alt}](${image.src})`;
      combinedContent = combinedContent.replace(placeholder, imageMarkdown);
    });

    return combinedContent;
  }, []); // 保持空依赖数组，确保函数引用稳定

  // 内容变化时自动保存（防抖）- 支持模式独立保存
  useEffect(() => {
    if ((currentContent || currentImages.length > 0) && !isLoading) {
      // 清除之前的定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // 设置新的定时器
      saveTimeoutRef.current = setTimeout(async () => {
        const currentMode: BoardMode = isMarkdownMode ? 'markdown' : 'normal';
        await saveModeContent(currentMode);
      }, 1000);
    }

    // 清理函数
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentContent, currentImages, isLoading, isMarkdownMode]); // 依赖当前模式的内容

  // === 数据加载和保存函数 ===

  // 加载初始数据（两种模式的数据）
  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // 并行加载两种模式的数据
      const [normalResponse, markdownResponse] = await Promise.all([
        fetch('/api/board?mode=normal'),
        fetch('/api/board?mode=markdown')
      ]);

      const normalData = await normalResponse.json();
      const markdownData = await markdownResponse.json();

      // 处理普通模式数据
      const normalRawContent = normalData.content || '';
      if (normalRawContent) {
        const { cleanContent, images: parsedImages } = parseContent(normalRawContent);
        setNormalContent(cleanContent);
        setNormalImages(parsedImages);
      }

      // 处理Markdown模式数据
      const markdownRawContent = markdownData.content || '';
      setMarkdownContent(markdownRawContent);

      console.log('初始数据加载完成');
    } catch (error) {
      console.error('加载初始数据失败:', error);
      // 设置默认空值
      setNormalContent('');
      setNormalImages([]);
      setMarkdownContent('');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载指定模式的内容
  const loadModeContent = async (mode: BoardMode) => {
    try {
      const response = await fetch(`/api/board?mode=${mode}`);
      const data = await response.json();
      const rawContent = data.content || '';

      if (mode === 'normal') {
        const { cleanContent, images: parsedImages } = parseContent(rawContent);
        setNormalContent(cleanContent);
        setNormalImages(parsedImages);
      } else {
        setMarkdownContent(rawContent);
      }

      console.log(`${mode === 'normal' ? '普通模式' : 'Markdown模式'}内容加载完成`);
    } catch (error) {
      console.error(`加载${mode === 'normal' ? '普通模式' : 'Markdown模式'}内容失败:`, error);
    }
  };

  // 保存指定模式的内容
  const saveModeContent = async (mode: BoardMode) => {
    try {
      let contentToSave = '';

      if (mode === 'normal') {
        // 普通模式：合并文本和图片
        contentToSave = combineContentWithImages(normalContent, normalImages);
      } else {
        // Markdown模式：直接保存内容
        contentToSave = markdownContent;
      }

      if (!contentToSave.trim()) return; // 空内容不保存

      setIsSaving(true);
      const response = await fetch('/api/board', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: contentToSave,
          mode
        }),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      console.log(`${mode === 'normal' ? '普通模式' : 'Markdown模式'}内容保存成功`);
    } catch (error) {
      console.error(`保存${mode === 'normal' ? '普通模式' : 'Markdown模式'}内容失败:`, error);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理文本变化 - 简化为直接更新，修复换行符删除bug
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = e.target.value;

    // 直接更新内容，不再使用复杂的重构逻辑
    // 这样可以确保换行符删除等所有编辑操作都能正常工作
    setCurrentContent(inputValue);
  };



  // 移除复杂的图片加载状态管理函数

  // 优化的图片组件 - 专注于直接嵌入显示，提供更好的用户体验
  // 核心特性：
  // 1. 直接显示图片，无加载占位符
  // 2. 简洁的错误处理
  // 3. 优化的性能和用户体验
  // 4. 符合用户偏好的直接显示方式
  // 5. 支持图片加载状态和错误处理
  const ImageComponent: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    // 重置状态当src改变时
    useEffect(() => {
      setImageError(false);
      setImageLoaded(false);
    }, [src]);

    if (imageError) {
      return (
        <div className="my-4 p-4 border border-dashed border-red-300 rounded-lg text-center text-red-500 bg-red-50">
          <div className="text-sm">❌ 图片加载失败</div>
          {alt && alt !== '网络图片' && <div className="text-xs mt-1 italic text-red-400">{alt}</div>}
          <div className="text-xs mt-1 text-red-400">请检查图片链接是否有效</div>
        </div>
      );
    }

    return (
      <div className="my-4 flex flex-col">
        {/* 图片容器 - 提供加载状态反馈 */}
        <div className={cn(
          "relative rounded-lg overflow-hidden border border-gray-200 shadow-sm",
          !imageLoaded && "bg-gray-100 animate-pulse"
        )}>
          {/* 直接显示图片 - 原生HTML img标签，性能最佳 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={cn(
              "max-w-full h-auto transition-opacity duration-200",
              imageLoaded ? "opacity-100" : "opacity-0",
              className
            )}
            style={{ maxHeight: '600px', objectFit: 'contain' }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />

          {/* 加载占位符 - 仅在图片未加载时显示 */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-gray-400 text-sm">📷 加载中...</div>
            </div>
          )}
        </div>

        {/* 图片描述 - 仅显示有意义的描述 */}
        {alt && alt !== '网络图片' && (
          <span className="text-xs text-gray-500 mt-2 text-center italic">
            {alt}
          </span>
        )}
      </div>
    );
  };

  // 添加图片 - 支持模式特定的图片管理
  const addImage = useCallback((src: string, alt: string) => {
    if (!isMarkdownMode) {
      // 普通模式：添加到图片数组
      const newImage: ImageData = {
        id: generateId(),
        src,
        alt
      };
      setCurrentImages(prev => [...prev, newImage]);
    }
    // Markdown模式不需要单独的图片数组，图片直接嵌入在文本中
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMarkdownMode]); // 依赖当前模式

  // 渲染内容（普通模式）- 优化图片嵌入显示，支持直接URL识别和占位符显示
  const renderContentWithDirectImages = (textContent: string, imageList: ImageData[]) => {
    const lines = textContent.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
      // 检查是否是图片占位符
      const imagePlaceholderMatch = line.match(/^\[图片: ([^\]]+)\]$/);
      if (imagePlaceholderMatch) {
        // 查找对应的图片并直接嵌入显示，完全隐藏占位符文本
        const altText = imagePlaceholderMatch[1];
        const matchingImage = imageList.find(img => img.alt === altText);

        if (matchingImage) {
          elements.push(
            <ImageComponent
              key={`image-${matchingImage.id}`}
              src={matchingImage.src}
              alt={matchingImage.alt}
            />
          );
        } else {
          // 如果找不到对应图片，显示简洁的占位符
          elements.push(
            <div key={`placeholder-${lineIndex}`} className="my-4 p-3 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 bg-gray-50">
              <div className="text-sm">📷 {altText}</div>
            </div>
          );
        }
        // 注意：占位符行不渲染任何文本，完全隐藏
      } else {
        // 检查是否包含直接的图片URL - 支持用户直接粘贴图片链接
        const urlRegex = /(https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s<>"']*)?)/gi;
        const urlMatches = Array.from(line.matchAll(urlRegex));

        if (urlMatches.length > 0) {
          // 处理包含图片URL的行
          let lastIndex = 0;
          urlMatches.forEach((match, urlIndex) => {
            const url = match[0];
            const matchIndex = match.index || 0;

            // 添加URL前的文本
            if (matchIndex > lastIndex) {
              const beforeText = line.slice(lastIndex, matchIndex);
              if (beforeText.trim()) {
                elements.push(
                  <div key={`text-before-${lineIndex}-${urlIndex}`} className="min-h-[1.5rem] text-gray-900">
                    {beforeText}
                  </div>
                );
              }
            }

            // 添加图片组件
            elements.push(
              <ImageComponent
                key={`url-image-${lineIndex}-${urlIndex}`}
                src={url}
                alt="网络图片"
              />
            );

            lastIndex = matchIndex + url.length;
          });

          // 添加最后一个URL后的文本
          if (lastIndex < line.length) {
            const afterText = line.slice(lastIndex);
            if (afterText.trim()) {
              elements.push(
                <div key={`text-after-${lineIndex}`} className="min-h-[1.5rem] text-gray-900">
                  {afterText}
                </div>
              );
            }
          }
        } else {
          // 普通文本行 - 确保文本清晰显示
          elements.push(
            <div key={`text-${lineIndex}`} className="min-h-[1.5rem] text-gray-900">
              {line || '\u00A0'}
            </div>
          );
        }
      }
    });

    return elements;
  };





  // 处理粘贴事件 - 优化版本
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      setIsUploadingImage(true);

      try {
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file && isImageFile(file)) {
            try {
              // 显示文件大小信息
              const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
              console.log(`正在上传图片: ${file.name || '未命名'} (${fileSizeMB}MB)`);

              // 转换为Base64
              const base64 = await fileToBase64(file);

              // 上传图片到服务器
              const response = await fetch('/api/upload-image', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageData: base64 }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '图片上传失败');
              }

              const result = await response.json();
              if (!result.success) {
                throw new Error(result.error || '图片上传失败');
              }

              // 使用服务器返回的路径，生成更友好的alt文本
              const altText = file.name ? file.name.replace(/\.[^/.]+$/, "") : '图片';
              const imageSrc = `/api/images/${result.imagePath.replace('data/pics/', '')}`;

              // 根据当前模式处理图片插入
              const textarea = textareaRef.current;
              if (textarea) {
                const cursorPosition = textarea.selectionStart;
                let insertText = '';

                if (isMarkdownMode) {
                  // Markdown模式：直接插入Markdown图片语法
                  insertText = `\n![${altText}](${imageSrc})\n`;
                } else {
                  // 普通模式：立即添加图片到数组并插入占位符，实现直接嵌入显示
                  addImage(imageSrc, altText);
                  insertText = `\n[图片: ${altText}]\n`;
                }

                const newContent = currentContent.slice(0, cursorPosition) + insertText + currentContent.slice(textarea.selectionEnd);
                setCurrentContent(newContent);

                // 设置光标位置到插入内容后面
                setTimeout(() => {
                  textarea.focus();
                  textarea.setSelectionRange(cursorPosition + insertText.length, cursorPosition + insertText.length);
                }, 0);
              }

              console.log(`图片上传成功: ${result.imagePath}`);
            } catch (error) {
              console.error('处理图片失败:', error);
              // 更友好的错误提示
              const errorMessage = error instanceof Error ? error.message : '图片处理失败';
              alert(`图片上传失败: ${errorMessage}\n请检查图片格式和大小后重试`);
            }
          }
        }
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  // 处理拖拽事件 - 修复闪烁问题
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 清除可能存在的离开定时器
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current);
      dragLeaveTimeoutRef.current = null;
    }

    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 使用防抖机制，避免在子元素间移动时频繁触发
    dragLeaveTimeoutRef.current = setTimeout(() => {
      setIsDragOver(false);
    }, 100); // 100ms 防抖延迟
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 清除拖拽离开定时器并立即设置状态
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current);
      dragLeaveTimeoutRef.current = null;
    }
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => isImageFile(file));

    if (imageFiles.length > 0) {
      setIsUploadingImage(true);

      try {
        for (const file of imageFiles) {
          try {
            console.log(`正在上传拖拽的图片: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

            const base64 = await fileToBase64(file);
            const response = await fetch('/api/upload-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ imageData: base64 }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || '图片上传失败');
            }

            const result = await response.json();
            if (!result.success) {
              throw new Error(result.error || '图片上传失败');
            }

            const altText = file.name.replace(/\.[^/.]+$/, "");
            const imageSrc = `/api/images/${result.imagePath.replace('data/pics/', '')}`;

            // 根据当前模式处理图片插入
            let insertText = '';
            if (isMarkdownMode) {
              // Markdown模式：直接插入Markdown图片语法
              insertText = `\n![${altText}](${imageSrc})\n`;
            } else {
              // 普通模式：立即添加图片到数组并插入占位符，实现直接嵌入显示
              addImage(imageSrc, altText);
              insertText = `\n[图片: ${altText}]\n`;
            }

            // 在文本末尾添加内容
            setCurrentContent(prev => prev + insertText);

            console.log(`拖拽图片上传成功: ${result.imagePath}`);
          } catch (error) {
            console.error('处理拖拽图片失败:', error);
            const errorMessage = error instanceof Error ? error.message : '图片处理失败';
            alert(`图片上传失败: ${errorMessage}`);
          }
        }
      } finally {
        setIsUploadingImage(false);
      }
    }
  }, [addImage]); // 移除不必要的依赖，避免无限循环

  // 处理普通模式的滚动事件同步
  const handleNormalModeScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const newScrollTop = target.scrollTop;
    setScrollTop(newScrollTop);

    // 同步渲染容器的滚动位置
    if (renderContainerRef.current) {
      renderContainerRef.current.scrollTop = newScrollTop;
    }
  }, []);

  // 处理普通模式容器的滚动事件（鼠标滚轮）
  const handleContainerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;
    setScrollTop(newScrollTop);

    // 同步textarea的滚动位置
    if (textareaRef.current) {
      textareaRef.current.scrollTop = newScrollTop;
    }
  }, []);

  // 处理鼠标滚轮事件（确保事件不穿透）
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isMarkdownMode) {
      // 在普通模式下阻止事件冒泡，防止穿透到底层
      e.stopPropagation();

      // 手动处理滚动
      const container = renderContainerRef.current;
      const textarea = textareaRef.current;

      if (container && textarea) {
        const delta = e.deltaY;
        const newScrollTop = Math.max(0, Math.min(
          container.scrollHeight - container.clientHeight,
          container.scrollTop + delta
        ));

        container.scrollTop = newScrollTop;
        textarea.scrollTop = newScrollTop;
        setScrollTop(newScrollTop);
      }
    }
  }, [isMarkdownMode]);

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
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

    // Tab 键插入空格
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = currentContent.slice(0, start) + '  ' + currentContent.slice(end);
      setCurrentContent(newContent);

      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  // 自定义Markdown组件
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
          <ImageComponent
            src={src}
            alt={alt}
            className="mx-auto"
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
      {/* 顶部工具栏 - 紧凑设计 */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* 应用标题 */}
          <h1 className="text-lg font-semibold text-gray-900">
            Nano Board
          </h1>

          {/* 模式切换按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMarkdownMode(!isMarkdownMode)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                isMarkdownMode
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              )}
              title="Ctrl+M 切换模式"
            >
              {isMarkdownMode ? 'Markdown' : '普通文本'}
            </button>
            {isMarkdownMode && (
              <button
                onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1',
                  showMarkdownPreview
                    ? 'bg-green-600 text-white shadow-sm hover:bg-green-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                )}
                title="Ctrl+P 切换预览"
              >
                {showMarkdownPreview ? '分栏预览' : '单栏编辑'}
              </button>
            )}
          </div>
        </div>

        {/* 状态指示器 */}
        <div className="flex items-center gap-4">
          {isUploadingImage && (
            <div className="flex items-center gap-2 text-orange-600">
              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">上传图片中...</span>
            </div>
          )}
          {isSaving && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">保存中...</span>
            </div>
          )}
          <span className="text-xs text-gray-500">
            Ctrl+M 切换模式{isMarkdownMode ? ' | Ctrl+P 切换预览' : ''}
          </span>
        </div>
      </div>

      {/* 主编辑区域 - 全屏白板 */}
      <div
        className="flex-1 flex overflow-hidden relative bg-white"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 拖拽覆盖层 */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-400 z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">📁</div>
              <div className="text-lg font-medium text-blue-700 mb-2">拖拽图片到这里</div>
              <div className="text-sm text-blue-600">支持 JPG、PNG、GIF、WebP 格式</div>
            </div>
          </div>
        )}

        {/* 普通模式编辑器 - 完全独立的界面，修复滚动事件穿透 */}
        {!isMarkdownMode && (
          <div
            className="absolute inset-0 bg-white z-20"
            onWheel={handleWheel}
            style={{ isolation: 'isolate' }} // 创建新的层叠上下文，防止事件穿透
          >
            <div className="relative h-full w-full overflow-hidden">
              {/* 可滚动的渲染容器 - 处理内容显示和滚动 */}
              <div
                ref={renderContainerRef}
                className="absolute inset-0 overflow-auto bg-white z-20 normal-mode-render-container"
                onScroll={handleContainerScroll}
              >
                <div className="p-8 min-h-full">
                  <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-900 max-w-none">
                    {currentContent.trim() || currentImages.length > 0 ? renderContentWithDirectImages(currentContent, currentImages) : (
                      <div className="text-gray-400 text-center mt-20">
                        <div className="text-2xl mb-4">✨</div>
                        <div className="text-lg mb-2">欢迎使用 Nano Board - 普通模式</div>
                        <div className="text-sm">
                          开始输入内容，支持粘贴或拖拽图片<br/>
                          按 Ctrl+M 切换到 Markdown 模式
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 完全透明的文本输入层 - 处理文本编辑和光标，修复换行符删除bug */}
              <textarea
                ref={textareaRef}
                value={currentContent}
                onChange={handleContentChange}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                onScroll={handleNormalModeScroll}
                className="absolute inset-0 w-full h-full p-8 border-none outline-none resize-none font-mono text-sm leading-relaxed bg-transparent z-30 plain-editor-overlay"
                style={{
                  color: 'transparent', // 完全透明，不显示任何文本
                  caretColor: '#374151', // 深灰色光标，保持可见
                  scrollbarWidth: 'none', // 隐藏滚动条，使用底层容器的滚动条
                  msOverflowStyle: 'none', // IE隐藏滚动条
                  WebkitTextFillColor: 'transparent', // Webkit浏览器完全透明
                }}
                placeholder="开始输入普通模式内容，支持粘贴或拖拽图片..."
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* Markdown模式编辑器 - 完全独立的界面 */}
        {isMarkdownMode && (
          <div className="absolute inset-0 bg-white z-20 flex">
            {/* Markdown编辑区域 */}
            <div className={cn(
              'relative bg-white',
              showMarkdownPreview ? 'flex-1 border-r border-gray-200' : 'w-full'
            )}>
              <textarea
                ref={textareaRef}
                value={currentContent}
                onChange={handleContentChange}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                className="w-full h-full p-8 border-none outline-none resize-none font-mono text-sm leading-relaxed focus:ring-0 bg-white z-30"
                placeholder="开始输入Markdown内容，支持粘贴或拖拽图片..."
                spellCheck={false}
              />
            </div>

            {/* Markdown预览区域（仅在开启预览时显示） */}
            {showMarkdownPreview && (
              <div className="flex-1 bg-gray-50 z-30">
                <div className="h-full overflow-auto p-8">
                  <div className="max-w-none">
                    {currentContent.trim() ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                        className="prose prose-sm max-w-none prose-gray"
                      >
                        {currentContent}
                      </ReactMarkdown>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        Markdown预览区域 - 在左侧输入内容后这里会显示渲染结果
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
