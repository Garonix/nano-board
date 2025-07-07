/**
 * 双模式白板编辑器
 * @description 支持普通模式和Markdown模式的编辑器组件
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { BoardEditorProps, ContentBlock } from '@/types';
import { updateAllTextareasHeight, adjustTextareaHeight, autoScrollToNewContent, debouncedAutoScrollToNewContent } from '@/lib/textareaUtils';
import { FileBlock } from '@/components/FileBlock';

// Hooks
import { useEditorState } from '@/hooks/useEditorState';
import { useContentConverter } from '@/hooks/useContentConverter';
import { useImageManager } from '@/hooks/useImageManager';
import { useFileManager } from '@/hooks/useFileManager';
import { useTextManager } from '@/hooks/useTextManager';
import { useScrollSync } from '@/hooks/useScrollSync';
import { useKeyboardHandlers } from '@/hooks/useKeyboardHandlers';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useBlockSave } from '@/hooks/useBlockSave';
import { useFileHistoryManager } from '@/hooks/useFileHistoryManager';
import { useDialog } from '@/hooks/useDialog';

// Components
import { HistorySidebar } from './HistorySidebar';
import { TopNavbar } from './TopNavbar';
import { FileOperationsManager } from './FileOperationsManager';
import { ConfirmDialog } from './Modal';
import { SaveStatusContainer } from './SaveStatusIndicator';
import { DragDropOverlay } from './DragDropOverlay';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * 双模式白板编辑器主组件
 * @param className - 自定义样式类名
 */
export const BoardEditor: React.FC<BoardEditorProps> = ({ className }) => {
  const {
    isConfirmOpen,
    confirmOptions,
    confirm,
    closeConfirm,
    handleConfirm,
    alert,
  } = useDialog();

  const {
    editorState,
    setIsMarkdownMode,
    setShowMarkdownPreview,
    setIsLoading,
    setIsUploadingImage,
    setIsUploadingFile,
    setIsUploadingText,
    setIsDragOver,
    setFocusedBlockId,
    setShowHistorySidebar,
    setHistorySidebarType,
    setLocalImageFiles,
    setLocalTextFiles,
    setLocalGeneralFiles,

    setFileHistoryLoadingState,
    updateCore,
    updateUI
  } = useEditorState();

  const {
    isMarkdownMode,
    showMarkdownPreview,
    isLoading,
    isUploadingImage,
    isUploadingText,

    isDragOver,
    focusedBlockId,
    showHistorySidebar,
    historySidebarType,
    localImageFiles,
    localTextFiles,
    localGeneralFiles,

    fileHistoryLoadingState
  } = editorState;

  const [normalBlocks, setNormalBlocks] = useState<ContentBlock[]>([
    { id: '1', type: 'text', content: '' }
  ]);
  const [markdownBlocks, setMarkdownBlocks] = useState<ContentBlock[]>([
    { id: '1', type: 'text', content: '' }
  ]);

  const [hoveredTextBlockId, setHoveredTextBlockId] = useState<string | null>(null);
  const [copyingBlockId, setCopyingBlockId] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null);

  /** 切换编辑模式并保存偏好 */
  const toggleMarkdownMode = useCallback(() => {
    const newMode = !isMarkdownMode;
    updateCore({ isMarkdownMode: newMode });
    updateUI({ showMarkdownPreview: false });
    localStorage.setItem('nano-board-markdown-mode', newMode.toString());
  }, [isMarkdownMode, updateCore, updateUI]);

  /** 切换Markdown预览并保存偏好 */
  const toggleMarkdownPreview = useCallback(() => {
    const newPreview = !showMarkdownPreview;
    setShowMarkdownPreview(newPreview);
    localStorage.setItem('nano-board-markdown-preview', newPreview.toString());
  }, [showMarkdownPreview, setShowMarkdownPreview]);

  // 双模式数据管理
  const currentBlocks = isMarkdownMode ? markdownBlocks : normalBlocks;
  const setCurrentBlocks = isMarkdownMode ? setMarkdownBlocks : setNormalBlocks;

  const isSingleNormalTextBlock = normalBlocks.length === 1 &&
                                  normalBlocks[0].type === 'text' &&
                                  !normalBlocks.some(block => block.type === 'image' || block.type === 'file');

  // 内容转换器
  const normalConverter = useContentConverter(false);
  const markdownConverter = useContentConverter(true);

  // 分块保存Hook - 普通模式
  const normalBlockSave = useBlockSave(false, normalConverter.blocksToContent, {
    savingBlockId,
    setSavingBlockId
  });

  // 分块保存Hook - Markdown模式
  const markdownBlockSave = useBlockSave(true, markdownConverter.blocksToContent, {
    savingBlockId,
    setSavingBlockId
  });

  /**
   * 复制文本块内容到剪贴板
   * @param content - 要复制的文本内容
   * @param blockId - 文本块ID，用于显示复制状态
   */
  const handleCopyText = useCallback(async (content: string, blockId: string) => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      await alert({
        message: '复制功能需要HTTPS环境或localhost才能使用，请在安全环境下访问此应用',
        type: 'warning'
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopyingBlockId(blockId);
      setTimeout(() => setCopyingBlockId(null), 1000);
    } catch (error) {
      console.error('复制失败:', error);
      await alert({
        message: '复制失败，请检查浏览器权限设置',
        type: 'error'
      });
      setCopyingBlockId(null);
    }
  }, []);

  /**
   * 复制完整Markdown内容到剪贴板
   */
  const handleCopyMarkdown = useCallback(async () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      await alert({
        message: '复制功能需要HTTPS环境或localhost才能使用，请在安全环境下访问此应用',
        type: 'warning'
      });
      return;
    }

    try {
      const content = markdownConverter.blocksToContent(markdownBlocks);
      await navigator.clipboard.writeText(content);
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 1000);
    } catch (error) {
      console.error('复制失败:', error);
      await alert({
        message: '复制失败，请检查浏览器权限设置',
        type: 'error'
      });
      setIsCopying(false);
    }
  }, [markdownConverter, markdownBlocks]);

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
          className="rounded-lg shadow-sm border border-gray-200 my-4 max-w-full"
          wrapLongLines={true}
          customStyle={{
            maxWidth: '100%',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
          {...rest}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={cn('bg-gray-100 px-2 py-1 rounded text-sm font-mono text-red-600 break-words', className)} {...rest}>
          {children}
        </code>
      );
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    img(props: any) {
      const { src, alt, ...rest } = props;
      return (
        <span className="inline-block my-6 text-center w-full">
          <div className="relative inline-block bg-surface-elevated rounded-xl overflow-hidden shadow-md border border-border hover:shadow-lg transition-all duration-200 max-w-full">
            {/* hover效果只在图片实际像素区域触发 */}
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-w-full h-auto block transition-transform duration-200 hover:scale-105 group"
                style={{
                  maxHeight: '400px',
                  objectFit: 'contain'
                }}
                {...rest}
              />
              {/* 图片hover遮罩层 - 精确覆盖图片实际像素区域 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
            </div>
          </div>
        </span>
      );
    },

    // 现代化标题组件 - 确保正确渲染
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1(props: any) {
      return <h1 className="text-3xl font-bold text-foreground mb-6 mt-8 pb-3 border-b-2 border-primary-200" {...props} />;
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
      const hasImage = React.Children.toArray(children).some((child) => {
        if (React.isValidElement(child)) {
          return child.type === 'img' || (child.props && typeof child.props === 'object' && child.props !== null && 'src' in child.props);
        }
        return false;
      });

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

    // 表格组件 - 修复宽度溢出问题
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table(props: any) {
      return (
        <div className="overflow-x-auto mb-4 max-w-full">
          <table className="w-full border border-gray-200 rounded-lg" style={{ tableLayout: 'fixed', wordWrap: 'break-word' }} {...props} />
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

  // 文件历史管理 Hook（简化版）
  const {
    refreshFileHistory
  } = useFileHistoryManager(
    setLocalImageFiles,
    setLocalTextFiles,
    setLocalGeneralFiles,
    setFileHistoryLoadingState
  );

  // 侧边栏切换的优化更新
  const toggleHistorySidebar = useCallback(async () => {
    const newSidebarState = !showHistorySidebar;
    setShowHistorySidebar(newSidebarState);

    if (newSidebarState) {
      // 打开时刷新本地文件历史
      await refreshFileHistory();
    }
  }, [showHistorySidebar, setShowHistorySidebar, refreshFileHistory]);

  // 双模式数据管理函数
  const updateNormalBlockContent = useCallback((blockId: string, content: string) => {
    setNormalBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, content } : block
    ));
  }, []);

  const updateMarkdownBlockContent = useCallback((blockId: string, content: string) => {
    setMarkdownBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, content } : block
    ));
  }, []);

  // 删除块函数（添加删除后保存机制）
  const deleteNormalBlock = useCallback((blockId: string) => {
    setNormalBlocks(prev => {
      const filtered = prev.filter(block => block.id !== blockId);
      if (filtered.length === 0) {
        // 如果删除后没有块了，创建新的空文本框
        const newBlockId = Date.now().toString();
        const newBlock: ContentBlock = { id: newBlockId, type: 'text', content: '' };

        // 自动滚动到新创建的文本框
        setTimeout(() => {
          autoScrollToNewContent(newBlockId, 100);
        }, 0);

        return [newBlock];
      }
      return filtered;
    });

    // 删除后立即触发保存
    setTimeout(async () => {
      await normalBlockSave.saveOnBlockDelete(blockId);
    }, 100);
  }, [normalBlockSave]);



  // 添加文本块函数
  const addNormalTextBlockAfter = useCallback((blockId: string) => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type: 'text',
      content: ''
    };
    setNormalBlocks(prev => {
      const index = prev.findIndex(block => block.id === blockId);
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });
    setFocusedBlockId(newBlock.id);

    // 自动滚动到新添加的文本框
    autoScrollToNewContent(newBlock.id, 150);
  }, [setFocusedBlockId]);



  // 清空文本块内容函数
  const clearNormalTextBlockContent = useCallback((blockId: string) => {
    setNormalBlocks(prev => prev.map(block =>
      block.id === blockId && block.type === 'text' ? { ...block, content: '' } : block
    ));
  }, []);

  /**
   * 在 Markdown 模式下插入文本到当前光标位置
   * @param content 要插入的文本内容
   */
  const insertTextAtCursor = useCallback((content: string) => {
    const textarea = document.querySelector('textarea[data-markdown-editor="true"]') as HTMLTextAreaElement;
    if (!textarea) {
      console.warn('未找到 Markdown 编辑器');
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;

    // 在光标位置插入内容，如果有选中文本则替换
    const newValue = currentValue.slice(0, start) + content + currentValue.slice(end);

    // 更新 React 状态
    const newBlocks = markdownConverter.contentToBlocks(newValue);
    setMarkdownBlocks(newBlocks);

    // 设置新的光标位置到插入内容的末尾
    setTimeout(() => {
      const newCursorPos = start + content.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }, []);

  // 适配的文本内容插入函数 - 根据当前模式插入到对应的数据块中
  const insertTextContentAdapted = useCallback((content: string) => {
    if (isMarkdownMode) {
      // Markdown 模式：在当前光标位置插入文本
      insertTextAtCursor(content);
    } else {
      // 普通模式：查找第一个空文本框或创建新的
      const emptyTextBlock = normalBlocks.find(block => block.type === 'text' && block.content.trim() === '');

      if (emptyTextBlock) {
        // 如果存在空文本框，直接填入内容
        setNormalBlocks(prev => prev.map(block =>
          block.id === emptyTextBlock.id ? { ...block, content } : block
        ));
        setFocusedBlockId(emptyTextBlock.id);
        // 自动滚动到填入内容的文本框
        autoScrollToNewContent(emptyTextBlock.id, 100);

        // 触发自动保存
        setTimeout(() => {
          normalBlockSave.saveOnImageInsert(emptyTextBlock.id);
        }, 100);
      } else {
        // 如果不存在空文本框，创建新的文本框
        const newTextBlock: ContentBlock = {
          id: Date.now().toString(),
          type: 'text',
          content
        };
        setNormalBlocks(prev => [...prev, newTextBlock]);
        setFocusedBlockId(newTextBlock.id);
        // 自动滚动到新创建的文本框
        autoScrollToNewContent(newTextBlock.id, 150);

        // 触发自动保存
        setTimeout(() => {
          normalBlockSave.saveOnImageInsert(newTextBlock.id);
        }, 100);
      }
    }
  }, [isMarkdownMode, insertTextAtCursor, normalBlocks, setFocusedBlockId, normalBlockSave]);



  // 图片管理 Hook（简化版）
  const {
    handleImagePaste,
    handleImageDrop
  } = useImageManager(
    setCurrentBlocks,
    isMarkdownMode,
    isMarkdownMode ? markdownConverter.contentToBlocks : normalConverter.contentToBlocks,
    setIsUploadingImage,
    refreshFileHistory,
    // 传递图片保存函数，图片插入后立即保存
    isMarkdownMode ? markdownBlockSave.saveOnImageInsert : normalBlockSave.saveOnImageInsert
  );

  // 文件管理 Hook
  const {
    handleFileDrop,
    handleFileDownload,
    insertFile
  } = useFileManager(
    setCurrentBlocks,
    isMarkdownMode,
    setIsUploadingFile,
    refreshFileHistory,
    // 传递文件保存函数，文件插入后立即保存
    isMarkdownMode ? markdownBlockSave.saveOnImageInsert : normalBlockSave.saveOnImageInsert,
    alert
  );

  // 文本管理 Hook
  const {
    handleTextPaste,
    handleTextDrop,
    handleTextDragDrop
  } = useTextManager(
    insertTextContentAdapted,
    refreshFileHistory,
    setIsUploadingText
  );

  // 滚动同步 Hook - 使用改进版本
  const {
    editorRef,
    previewRef,
    syncScrollFromEditor,
    syncScrollFromPreview,
    resetScrollSync,
    cleanup: cleanupScrollSync
  } = useScrollSync();

  // 键盘事件处理 Hook
  const { handleMarkdownKeyDown, handleKeyDown } = useKeyboardHandlers(
    currentBlocks,
    isMarkdownMode,
    showMarkdownPreview,
    setIsMarkdownMode,
    setShowMarkdownPreview,
    isMarkdownMode ? updateMarkdownBlockContent : updateNormalBlockContent,
    () => {}, // deleteEmptyTextBlock - 简化实现
    setFocusedBlockId,
    isMarkdownMode ? markdownConverter.contentToBlocks : normalConverter.contentToBlocks,
    setCurrentBlocks
  );

  // 组合拖拽处理函数 - 同时支持文本、图片和文件
  const handleCombinedDrop = useCallback(async (files: File[], textContent?: string) => {
    // 如果有文本内容，优先处理文本拖拽
    if (textContent && textContent.trim()) {
      // 创建模拟的拖拽事件来处理文本内容
      const mockEvent = {
        dataTransfer: {
          getData: (type: string) => type === 'text/plain' ? textContent : '',
          files: { length: 0 } as FileList
        }
      } as React.DragEvent;

      await handleTextDragDrop(mockEvent);
      return;
    }

    // 如果没有文本内容，处理文件拖拽
    if (files.length > 0) {
      // 创建FileList对象以兼容useFileManager
      const fileList = {
        length: files.length,
        item: (index: number) => files[index] || null,
        [Symbol.iterator]: function* () {
          for (let i = 0; i < files.length; i++) {
            yield files[i];
          }
        }
      } as FileList;

      // 同时处理文本文件、图片和其他文件拖拽
      await Promise.all([
        handleTextDrop(files),   // useTextManager期望File[]
        handleImageDrop(files),  // useImageManager期望File[]
        handleFileDrop(fileList) // useFileManager期望FileList
      ]);
    }
  }, [handleTextDrop, handleImageDrop, handleFileDrop, handleTextDragDrop]);

  // 组合粘贴处理函数 - 同时支持文本和图片粘贴
  const handleCombinedPaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const hasImages = items.some(item => item.type.startsWith('image/'));

    if (hasImages) {
      // 如果有图片，优先处理图片粘贴
      await handleImagePaste(e);
    } else {
      // 如果没有图片，处理文本粘贴
      // 在普通模式下，文本粘贴会通过useTextManager创建新的文本框
      await handleTextPaste(e);
    }
  }, [handleImagePaste, handleTextPaste]);

  // 拖拽处理 Hook
  const { handleDragOver, handleDragLeave, handleDrop, cleanup: cleanupDragAndDrop } = useDragAndDrop(
    isDragOver,
    setIsDragOver,
    handleCombinedDrop
  );

  // 双模式数据持久化
  const loadNormalData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/board?mode=normal');
      const data = await response.json();
      const loadedBlocks = normalConverter.contentToBlocks(data.content || '');
      setNormalBlocks(loadedBlocks);
    } catch (error) {
      console.error('加载普通模式数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [normalConverter, setIsLoading]);

  const loadMarkdownData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/board?mode=markdown');
      const data = await response.json();
      const loadedBlocks = markdownConverter.contentToBlocks(data.content || '');
      setMarkdownBlocks(loadedBlocks);
    } catch (error) {
      console.error('加载Markdown模式数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [markdownConverter, setIsLoading]);

  // 注意：原有的防抖保存函数已被分块保存机制替代

  // 清空所有内容函数
  const clearAllNormalContent = useCallback(async () => {
    const confirmed = await confirm({
      title: '确认清空',
      message: '确定要清空普通模式的所有内容吗？此操作无法撤销。',
      confirmText: '清空',
      confirmType: 'danger'
    });

    if (confirmed) {
      setNormalBlocks([{ id: Date.now().toString(), type: 'text', content: '' }]);
      try {
        await fetch('/api/board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '', mode: 'normal' }),
        });
      } catch (error) {
        console.error('清空普通模式数据失败:', error);
      }
    }
  }, [confirm]);

  const clearAllMarkdownContent = useCallback(async () => {
    const confirmed = await confirm({
      title: '确认清空',
      message: '确定要清空Markdown模式的所有内容吗？此操作无法撤销。',
      confirmText: '清空',
      confirmType: 'danger'
    });

    if (confirmed) {
      setMarkdownBlocks([{ id: Date.now().toString(), type: 'text', content: '' }]);
      try {
        await fetch('/api/board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '', mode: 'markdown' }),
        });
      } catch (error) {
        console.error('清空Markdown模式数据失败:', error);
      }
    }
  }, [confirm]);

  const clearAllCurrentContent = isMarkdownMode ? clearAllMarkdownContent : clearAllNormalContent;

  // 创建确认函数供HistorySidebar使用
  const handleConfirmDialog = useCallback(async (message: string): Promise<boolean> => {
    return await confirm({
      title: '确认操作',
      message,
      confirmText: '确认',
      confirmType: 'danger'
    });
  }, [confirm]);

  // 初始化 - 加载设置并预加载两种模式的数据
  useEffect(() => {
    // 加载保存的设置
    const savedMode = localStorage.getItem('nano-board-markdown-mode');
    const savedPreview = localStorage.getItem('nano-board-markdown-preview');

    if (savedMode) {
      setIsMarkdownMode(savedMode === 'true');
    }
    if (savedPreview) {
      setShowMarkdownPreview(savedPreview === 'true');
    }

    // 预加载两种模式的数据以实现零延迟切换
    Promise.all([loadNormalData(), loadMarkdownData()]);
  }, []); // 只在组件挂载时执行一次

  // 更新blocks状态到保存Hook中
  useEffect(() => {
    normalBlockSave.updateBlocks(normalBlocks);
  }, [normalBlocks, normalBlockSave]);

  useEffect(() => {
    markdownBlockSave.updateBlocks(markdownBlocks);
  }, [markdownBlocks, markdownBlockSave]);

  // 保存设置
  useEffect(() => {
    localStorage.setItem('nano-board-markdown-mode', isMarkdownMode.toString());
  }, [isMarkdownMode]);

  useEffect(() => {
    localStorage.setItem('nano-board-markdown-preview', showMarkdownPreview.toString());
  }, [showMarkdownPreview]);

  // 当预览模式切换时重置滚动同步状态
  useEffect(() => {
    if (isMarkdownMode) {
      // 延迟重置，确保 DOM 更新完成
      setTimeout(() => {
        resetScrollSync();
      }, 100);
    }
  }, [showMarkdownPreview, isMarkdownMode, resetScrollSync]);

  // 清理函数
  useEffect(() => {
    return () => {
      cleanupDragAndDrop();
      cleanupScrollSync();
    };
  }, [cleanupDragAndDrop, cleanupScrollSync]);

  // 当普通模式文本框布局状态改变时，立即更新普通模式文本框高度
  // 注意：只在普通模式下或者普通模式状态变化时才更新，避免影响 Markdown 模式的固定高度
  useEffect(() => {
    // 只有在普通模式下，或者普通模式的单文本框状态发生变化时才更新
    if (!isMarkdownMode || isSingleNormalTextBlock !== (normalBlocks.length === 1 && normalBlocks[0].type === 'text' && !normalBlocks.some(block => block.type === 'image' || block.type === 'file'))) {
      updateAllTextareasHeight(isSingleNormalTextBlock);
    }
  }, [isMarkdownMode, isSingleNormalTextBlock, normalBlocks]); // 依赖模式和普通模式的状态

  if (isLoading) {
    return <LoadingSpinner message="加载中..." />;
  }

  return (
    <FileOperationsManager
      isMarkdownMode={isMarkdownMode}
      blocks={currentBlocks}
      contentToBlocks={isMarkdownMode ? markdownConverter.contentToBlocks : normalConverter.contentToBlocks}
      blocksToContent={isMarkdownMode ? markdownConverter.blocksToContent : normalConverter.blocksToContent}
      onSetBlocks={setCurrentBlocks}
      onInsertTextContent={insertTextContentAdapted}
      onCloseHistorySidebar={() => setShowHistorySidebar(false)}
      onRefreshFileHistory={refreshFileHistory}
      saveOnImageInsert={isMarkdownMode ? markdownBlockSave.saveOnImageInsert : normalBlockSave.saveOnImageInsert}
      _saveOnBlockDelete={isMarkdownMode ? markdownBlockSave.saveOnBlockDelete : normalBlockSave.saveOnBlockDelete}
    >
      {(fileOperations) => (
        <div className={cn('h-screen flex flex-col bg-white', className)}>
          {/* 顶部导航栏 */}
          <TopNavbar
            isMarkdownMode={isMarkdownMode}
            showMarkdownPreview={showMarkdownPreview}
            isUploadingImage={isUploadingImage}
            isUploadingText={isUploadingText}
            fileHistoryLoadingState={fileHistoryLoadingState}
            onToggleMarkdownMode={toggleMarkdownMode}
            onToggleMarkdownPreview={toggleMarkdownPreview}
            onClearAllContent={clearAllCurrentContent}
            onToggleHistorySidebar={toggleHistorySidebar}
          />

          {/* 现代化主编辑区域 */}
          <div
            className="flex-1 flex overflow-hidden relative bg-white"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* 拖拽提示覆盖层 */}
            <DragDropOverlay isDragOver={isDragOver} />

            {/* 普通模式编辑器 - 预渲染，通过CSS控制显示/隐藏 */}
            <div
              className={cn(
                'w-full h-full absolute inset-0',
                isMarkdownMode ? 'invisible opacity-0 pointer-events-none' : 'visible opacity-100'
              )}
              style={{
                transition: 'opacity 0ms', // 零延迟切换
              }}
            >
              {/* 普通模式编辑器内联内容 */}
              <div className="w-full h-full overflow-auto p-2">
                {/* 添加响应式左右边距，缩减文本框宽度以提升阅读体验，保持居中显示 */}
                {/* 大屏幕：左右各300px边距，中等屏幕：150px，小屏幕：20px */}
                <div className="max-w-none space-y-3 mx-auto px-5 md:px-[150px] xl:px-[300px] min-w-0">
                  {normalBlocks.map((block, index) => {
                    return (
                      <div key={block.id} className="relative group">
                        {block.type === 'text' ? (
                          <div
                            className="relative"
                            onMouseEnter={() => setHoveredTextBlockId(block.id)}
                            onMouseLeave={() => setHoveredTextBlockId(null)}
                          >
                            {/* 文本框操作按钮组 - 悬停时显示 */}
                            {hoveredTextBlockId === block.id && (
                              <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                {/* 空文本框只显示删除按钮 */}
                                {!block.content.trim() ? (
                                  <button
                                    onClick={() => deleteNormalBlock(block.id)}
                                    className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center"
                                    title="删除此文本框"
                                  >
                                    {/* 使用简单的红叉图标 */}
                                    ✕
                                  </button>
                                ) : (
                                  // 非空文本框显示完整按钮组
                                  <>
                                    <button
                                      onClick={() => handleCopyText(block.content, block.id)}
                                      className="w-5 h-5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center"
                                      title="复制"
                                    >
                                      {/* 显示复制状态或复制图标 */}
                                      {copyingBlockId === block.id ? '✓' : '⧉'}
                                    </button>
                                    <button
                                      onClick={() => fileOperations.handleSaveText(block.content)}
                                      disabled={fileOperations.isSavingText}
                                      className="w-5 h-5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center font-bold"
                                      title="保存"
                                    >
                                      {/* 使用简单的下箭头图标表示保存 */}
                                      {fileOperations.isSavingText ? '...' : '↓'}
                                    </button>
                                    <button
                                      onClick={() => clearNormalTextBlockContent(block.id)}
                                      className="w-5 h-5 bg-orange-500 hover:bg-orange-600 text-white text-s rounded-md shadow-lg transition-all duration-200 flex items-center justify-center"
                                      title="清空"
                                    >
                                      {/* 使用简单的循环符号表示清空重置 */}
                                      ↻
                                    </button>
                                    <button
                                      onClick={() => deleteNormalBlock(block.id)}
                                      className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center"
                                      title="删除"
                                    >
                                      {/* 使用简单的红叉图标 */}
                                      ✕
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            <SaveStatusContainer
                              isVisible={savingBlockId === block.id}
                            >
                              <textarea
                                ref={(el) => {
                                  if (el && focusedBlockId === block.id) {
                                    // 当获得焦点时自动调整高度
                                    setTimeout(() => {
                                      adjustTextareaHeight(el, block.content, isSingleNormalTextBlock);
                                    }, 0);
                                  }
                                }}
                                data-block-id={block.id}
                                value={block.content}
                                onChange={(e) => {
                                  const newContent = e.target.value;
                                  updateNormalBlockContent(block.id, newContent);

                                  // 智能调整高度
                                  const target = e.target as HTMLTextAreaElement;
                                  adjustTextareaHeight(target, newContent, isSingleNormalTextBlock);

                                  // 如果内容增加导致高度变化，使用防抖自动滚动确保内容可见
                                  if (newContent.length > 0) {
                                    debouncedAutoScrollToNewContent(block.id, 50);
                                  }
                                }}
                                onPaste={handleCombinedPaste}
                                onKeyDown={(e) => handleKeyDown(e, block.id)}
                                onFocus={(e) => {
                                  setFocusedBlockId(block.id);
                                  // 聚焦时调整高度
                                  const target = e.target as HTMLTextAreaElement;
                                  setTimeout(() => {
                                    adjustTextareaHeight(target, block.content, isSingleNormalTextBlock);
                                  }, 0);
                                }}
                                onBlur={() => {
                                  // 失焦时触发保存
                                  normalBlockSave.saveOnBlur(block.id);
                                }}
                                className={cn(
                                  "w-full p-4 border rounded-lg outline-none resize-none font-mono text-sm leading-relaxed bg-surface-elevated textarea-no-scrollbar transition-all duration-200",
                                  focusedBlockId === block.id
                                    ? "border-transparent ring-4 ring-primary-600/70"
                                    : "border-border hover:border-transparent hover:ring-4 hover:ring-gray-400/50",
                                  isSingleNormalTextBlock
                                    ? "min-h-[25rem] max-h-[25rem]"
                                    : "min-h-[2.5rem] max-h-[10rem]"
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
                                  height: isSingleNormalTextBlock
                                    ? '25rem'
                                    : 'auto',
                                  minHeight: isSingleNormalTextBlock
                                    ? '25rem'
                                    : '2.5rem',
                                  maxHeight: isSingleNormalTextBlock
                                    ? '25rem'
                                    : '10rem',
                                  overflowY: 'auto' // 启用垂直滚动，支持滚轮操作
                                }}
                              />
                            </SaveStatusContainer>
                          </div>
                        ) : block.type === 'image' ? (
                          <div className="w-full text-center my-4">
                            {/* 图片容器 - hover效果只在图片实际区域内触发 */}
                            <div className="relative inline-block bg-surface-elevated rounded-xl overflow-hidden shadow-md border border-border hover:shadow-lg transition-all duration-200 max-w-full">
                              {/* 现代化图片删除按钮 - 只在图片hover时显示 */}
                              <button
                                onClick={() => deleteNormalBlock(block.id)}
                                className="absolute top-3 right-3 z-10 w-5 h-5 bg-error-500 hover:bg-error-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                                title="删除图片"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>

                              {/* 现代化图片展示 - hover效果只在图片实际像素区域触发 */}
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={block.content}
                                  alt={block.alt || '图片'}
                                  className="max-w-full h-auto block transition-transform duration-200 hover:scale-105 group"
                                  style={{
                                    maxHeight: '400px',
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
                                      <div class="text-2xl mb-3">⚠️</div>
                                      <div class="text-sm font-medium text-red-600">图片加载失败</div>
                                      <div class="text-xs mt-2 text-red-400">请检查图片链接</div>
                                    </div>
                                    `;
                                  }}
                                />
                                {/* 图片hover遮罩层 - 精确覆盖图片实际像素区域 */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                              </div>
                            </div>
                          </div>
                        ) : block.type === 'file' ? (
                          <FileBlock
                            block={block}
                            onDelete={deleteNormalBlock}
                            onDownload={handleFileDownload}
                          />
                        ) : null}

                        {/* 现代化新建文本框按钮 - 悬停时显示，紧贴元素边缘 */}
                        {(block.type === 'image' || block.type === 'file' || (block.type === 'text' && block.content.trim())) && (
                          <div className="relative">
                            <button
                              onClick={() => addNormalTextBlockAfter(block.id)}
                              className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 opacity-0 group-hover:opacity-100"
                              style={{
                                top: block.type === 'text' ? '-6px' : '-23px' // 紧贴文本框下边框或图片/文件容器下边缘
                              }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Markdown 模式编辑器 - 预渲染，通过CSS控制显示/隐藏 */}
            <div
              className={cn(
                'w-full h-full absolute inset-0',
                !isMarkdownMode ? 'invisible opacity-0 pointer-events-none' : 'visible opacity-100'
              )}
              style={{
                transition: 'opacity 0ms', // 零延迟切换
              }}
            >
              {/* Markdown 模式编辑器内联内容 - 修复分栏布局高度一致性问题 */}
              <div className="flex w-full h-full px-4 py-2 gap-2">
                {/* 编辑区域 - 使用统一的flex布局和高度计算确保与预览区域完全一致 */}
                <div className={cn(
                  'flex flex-col min-w-0', // 使用min-w-0防止内容溢出影响flex宽度计算
                  showMarkdownPreview ? 'flex-1' : 'w-full'
                )}>
                  {/* 现代化文本编辑区域容器 - 使用固定高度确保与预览区域高度一致 */}
                  <SaveStatusContainer
                    isVisible={savingBlockId === 'markdown-editor'}
                  >
                    <div
                      className="border border-border rounded-lg bg-surface-elevated hover:border-transparent hover:ring-4 hover:ring-gray-400/50 focus-within:border-transparent focus-within:ring-4 focus-within:ring-primary-600/70 shadow-sm hover:shadow-md transition-all duration-200 relative"
                      onMouseEnter={() => setIsHovered(true)}
                      onMouseLeave={() => setIsHovered(false)}
                      style={{
                        minHeight: 'calc(100vh - 140px)', // 与预览区域完全一致的高度
                        height: 'calc(100vh - 140px)',
                        maxHeight: 'calc(100vh - 140px)'
                      }}
                    >
                      <textarea
                        id="markdown-editor"
                        ref={editorRef}
                        data-markdown-editor="true"
                        value={markdownConverter.blocksToContent(markdownBlocks)}
                        onChange={(e) => {
                          const newBlocks = markdownConverter.contentToBlocks(e.target.value);
                          const previousLength = markdownConverter.blocksToContent(markdownBlocks).length;
                          const currentLength = e.target.value.length;

                          setMarkdownBlocks(newBlocks);

                          // 检测是否为删除操作（内容长度减少）
                          if (currentLength < previousLength) {
                            // 删除操作立即触发保存
                            setTimeout(async () => {
                              await markdownBlockSave.saveOnBlockDelete('markdown-editor');
                            }, 100);
                          }

                          // 内容变化时重置滚动同步状态，确保同步准确性
                          // 使用 setTimeout 确保 DOM 更新完成后再重置
                          setTimeout(() => {
                            resetScrollSync();
                          }, 0);
                        }}
                        onPaste={handleCombinedPaste}
                        onKeyDown={handleMarkdownKeyDown}
                        onScroll={showMarkdownPreview ? syncScrollFromEditor : undefined}
                        onBlur={() => {
                          // 失焦时触发保存（Markdown模式保存整个内容）
                          if (markdownBlocks.length > 0) {
                            markdownBlockSave.saveOnBlur('markdown-editor');
                          }
                        }}
                        className="w-full h-full p-3 border-none outline-none resize-none font-mono text-sm leading-relaxed bg-transparent overflow-auto textarea-no-scrollbar rounded-lg markdown-editor-textarea"
                        placeholder="开始输入Markdown内容，支持粘贴图片..."
                        spellCheck={false}
                      />

                      {/* 复制按钮 - 右上角显示，hover时显示，空内容时不显示 */}
                      {markdownConverter.blocksToContent(markdownBlocks).trim() && isHovered && (
                        <button
                          onClick={handleCopyMarkdown}
                          className="absolute top-2 right-2 w-5 h-5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center z-10"
                          title="复制"
                        >
                          {/* 显示复制状态或复制图标 */}
                          {isCopying ? '✓' : '⧉'}
                        </button>
                      )}
                    </div>
                  </SaveStatusContainer>
                </div>

                {/* 预览区域 - 保持原有预览样式，只修复高度一致性 */}
                {showMarkdownPreview && (
                  <div className="flex-1 flex flex-col min-w-0"> {/* 使用min-w-0防止内容溢出影响flex宽度计算 */}
                    {/* 现代化预览区域容器 - 与编辑区域使用完全相同的高度设置 */}
                    <div
                      className="border border-border rounded-lg bg-neutral-50 shadow-sm hover:shadow-md transition-shadow duration-200"
                      style={{
                        minHeight: 'calc(100vh - 140px)', // 与编辑区域完全一致的高度
                        height: 'calc(100vh - 140px)',
                        maxHeight: 'calc(100vh - 140px)'
                      }}
                    >
                      <div
                        ref={previewRef}
                        className="h-full overflow-auto p-3"
                        onScroll={syncScrollFromPreview}
                      >
                        {markdownConverter.blocksToContent(markdownBlocks).trim() ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                            className="prose prose-sm max-w-none prose-gray markdown-preview-content"
                          >
                            {markdownConverter.blocksToContent(markdownBlocks)}
                          </ReactMarkdown>
                        ) : (
                          <div className="text-gray-400 text-sm">
                            Markdown预览区域
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 历史侧边栏 - 使用独立组件 */}
          <HistorySidebar
            isVisible={showHistorySidebar}
            onClose={() => setShowHistorySidebar(false)}
            sidebarType={historySidebarType}
            onSidebarTypeChange={setHistorySidebarType}
            imageFiles={localImageFiles}
            textFiles={localTextFiles}
            generalFiles={localGeneralFiles}
            loadingState={fileHistoryLoadingState}
            onRefresh={refreshFileHistory}
            onImageInsert={(imageSrc: string, altText: string) => {
              // 适配器：将 HistorySidebar 的接口转换为 BoardEditor 的接口
              // HistorySidebar 传递 (imageSrc, altText)，但 handleInsertLocalImageFile 需要 (imagePath, fileName)
              // 从 imageSrc 推断 fileName
              const fileName = imageSrc.split('/').pop() || altText;
              fileOperations.handleInsertLocalImageFile(imageSrc, fileName);
            }}
            onTextInsert={fileOperations.handleRestoreLocalTextFile}
            onFileInsert={async (fileName: string) => {
              // 从本地文件列表中找到文件信息
              const fileInfo = localGeneralFiles.find(f => f.fileName === fileName);
              if (fileInfo) {
                await insertFile(
                  fileInfo.fileName,
                  fileInfo.size,
                  fileInfo.mimeType,
                  fileInfo.extension,
                  fileInfo.downloadPath
                );
              }
            }}
            onFileDelete={async (fileName: string, type: 'image' | 'text' | 'file') => {
              if (type === 'file') {
                // 处理文件删除 - 需要实现文件删除逻辑
                console.log('删除文件:', fileName);
              } else {
                await fileOperations.handleDeleteLocalFile(fileName, type);
              }
            }}
            onClearAll={async (type: 'image' | 'text' | 'file') => {
              if (type === 'file') {
                // 处理清空所有文件 - 需要实现清空逻辑
                console.log('清空所有文件');
              } else {
                await fileOperations.handleClearAllLocalFiles(type);
              }
            }}
            onConfirm={handleConfirmDialog}
          />

          {/* 确认对话框 */}
          <ConfirmDialog
            isOpen={isConfirmOpen}
            onClose={closeConfirm}
            onConfirm={handleConfirm}
            title={confirmOptions?.title}
            message={confirmOptions?.message || ''}
            confirmText={confirmOptions?.confirmText}
            cancelText={confirmOptions?.cancelText}
            confirmType={confirmOptions?.confirmType}
          />
        </div>
      )}
    </FileOperationsManager>
  );
};
