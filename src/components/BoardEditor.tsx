/**
 * 简单白板编辑器
 * 普通模式：大文本框，支持文字和图片粘贴
 * Markdown模式：支持Markdown语法
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { BoardEditorProps } from '@/types';
import { markdownComponents } from '@/lib/markdownComponents';
import { adjustTextareaHeight, updateAllTextareasHeight } from '@/lib/textareaUtils';

// 自定义 Hooks
import { useEditorState } from '@/hooks/useEditorState';
import { useContentConverter } from '@/hooks/useContentConverter';
import { useImageManager } from '@/hooks/useImageManager';
import { useScrollSync } from '@/hooks/useScrollSync';
import { useDataPersistence } from '@/hooks/useDataPersistence';
import { useKeyboardHandlers } from '@/hooks/useKeyboardHandlers';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useTextManager } from '@/hooks/useTextManager';
import { useFileHistoryManager } from '@/hooks/useFileHistoryManager';

export const BoardEditor: React.FC<BoardEditorProps> = ({ className }) => {
  // 使用自定义 Hooks 管理状态和逻辑
  const {
    editorState,
    isSingleTextBlock,
    setBlocks,
    setIsMarkdownMode,
    setShowMarkdownPreview,
    setIsLoading,
    setIsUploadingImage,
    setIsDragOver,
    setFocusedBlockId,
    setShowHistorySidebar,
    setHistorySidebarType,
    setLocalImageFiles,
    setLocalTextFiles,
    setFileHistoryLoadingState,
    updateBlockContent,
    deleteBlock,
    deleteEmptyTextBlock,
    clearAllBlocks,
    syncBlocksAfterModeSwitch,
    addTextBlockAfter,
    insertTextContent,
    clearTextBlockContent
  } = useEditorState();

  // 解构编辑器状态
  const {
    blocks,
    isMarkdownMode,
    showMarkdownPreview,
    isLoading,
    isUploadingImage,
    isDragOver,
    focusedBlockId,
    showHistorySidebar,
    historySidebarType,
    localImageFiles,
    localTextFiles,
    fileHistoryLoadingState
  } = editorState;

  // 内容转换 Hook
  const { blocksToContent, contentToBlocks } = useContentConverter(isMarkdownMode);

  // 文件历史管理 Hook
  const {
    refreshFileHistory,
    getLocalTextFileContent,
    deleteLocalFile,
    clearAllLocalFiles
  } = useFileHistoryManager(
    setLocalImageFiles,
    setLocalTextFiles,
    setFileHistoryLoadingState
  );

  // 图片管理 Hook（简化版）
  const {
    handleImagePaste,
    handleImageDrop
  } = useImageManager(
    setBlocks,
    isMarkdownMode,
    contentToBlocks,
    setIsUploadingImage,
    refreshFileHistory
  );

  // 滚动同步 Hook
  const { editorRef, previewRef, syncScrollFromEditor, syncScrollFromPreview, cleanup: cleanupScrollSync } = useScrollSync();

  // 数据持久化 Hook
  const { loadData, debouncedSave, clearAllContent, cleanup: cleanupDataPersistence } = useDataPersistence(
    isMarkdownMode,
    blocksToContent,
    contentToBlocks,
    setBlocks,
    setFocusedBlockId,
    setIsLoading,
    syncBlocksAfterModeSwitch
  );

  // 键盘事件处理 Hook
  const { handleMarkdownKeyDown, handleKeyDown } = useKeyboardHandlers(
    blocks,
    isMarkdownMode,
    showMarkdownPreview,
    setIsMarkdownMode,
    setShowMarkdownPreview,
    updateBlockContent,
    deleteEmptyTextBlock,
    setFocusedBlockId,
    contentToBlocks,
    setBlocks
  );

  // 拖拽处理 Hook
  const { handleDragOver, handleDragLeave, handleDrop, cleanup: cleanupDragAndDrop } = useDragAndDrop(
    isDragOver,
    setIsDragOver,
    handleImageDrop
  );

  // 文本管理 Hook（简化版）
  const {
    saveTextToFile
  } = useTextManager();



  // 引用
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 文本保存按钮状态
  const [hoveredTextBlockId, setHoveredTextBlockId] = useState<string | null>(null);
  const [isSavingText, setIsSavingText] = useState(false);

  // 处理文本保存
  const handleSaveText = async (content: string) => {
    if (!content.trim()) {
      alert('不能保存空白内容');
      return;
    }

    setIsSavingText(true);
    try {
      const success = await saveTextToFile(content);
      if (success) {
        alert('文本保存成功！');
      } else {
        alert('文本保存失败，请重试');
      }
    } catch (error) {
      console.error('保存文本时发生错误:', error);
      alert('文本保存失败，请重试');
    } finally {
      setIsSavingText(false);
    }
  };

  // 注意：文本历史恢复功能已移除，统一使用本地文件恢复

  // 处理从本地文本文件恢复内容
  const handleRestoreLocalTextFile = async (fileName: string) => {
    try {
      const content = await getLocalTextFileContent(fileName);
      if (content) {
        // 在普通模式下，智能插入内容（优先使用空文本框）
        if (!isMarkdownMode) {
          insertTextContent(content);
        } else {
          // 在Markdown模式下，将内容添加到编辑器
          const newBlocks = contentToBlocks(blocksToContent(blocks) + '\n\n' + content);
          setBlocks(newBlocks);
        }
        setShowHistorySidebar(false);
      } else {
        alert('无法读取本地文本文件内容');
      }
    } catch (error) {
      console.error('恢复本地文本文件时发生错误:', error);
      alert('恢复本地文本文件失败，请重试');
    }
  };

  // 处理插入本地图片文件
  const handleInsertLocalImageFile = (imagePath: string, fileName: string) => {
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
          setBlocks(newBlocks);

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
        setBlocks(prev => [...prev, newImageBlock]);
      }

      setShowHistorySidebar(false);
    } catch (error) {
      console.error('插入本地图片文件时发生错误:', error);
      alert('插入本地图片文件失败，请重试');
    }
  };

  // 处理删除本地文件
  const handleDeleteLocalFile = async (fileName: string, fileType: 'image' | 'text') => {
    if (!window.confirm(`确定要删除这个${fileType === 'image' ? '图片' : '文本'}文件吗？`)) {
      return;
    }

    try {
      const success = await deleteLocalFile(fileName, fileType);
      if (success) {
        // 刷新文件历史
        await refreshFileHistory();
        alert('文件删除成功！');
      } else {
        alert('文件删除失败，请重试');
      }
    } catch (error) {
      console.error('删除本地文件时发生错误:', error);
      alert('删除本地文件失败，请重试');
    }
  };

  // 处理清除所有本地文件
  const handleClearAllLocalFiles = async (fileType: 'image' | 'text') => {
    try {
      const success = await clearAllLocalFiles(fileType);
      if (success) {
        // 刷新文件历史
        await refreshFileHistory();
        alert(`所有${fileType === 'image' ? '图片' : '文本'}文件清除成功！`);
      } else {
        alert(`清除${fileType === 'image' ? '图片' : '文本'}文件失败，请重试`);
      }
    } catch (error) {
      console.error('清除本地文件时发生错误:', error);
      alert(`清除${fileType === 'image' ? '图片' : '文本'}文件失败，请重试`);
    }
  };













  // 初始化
  useEffect(() => {
    // 加载保存的设置
    const savedMode = localStorage.getItem('nano-board-markdown-mode');
    const savedPreview = localStorage.getItem('nano-board-markdown-preview');
    if (savedMode) setIsMarkdownMode(savedMode === 'true');
    if (savedPreview) setShowMarkdownPreview(savedPreview === 'true');
  }, [setIsMarkdownMode, setShowMarkdownPreview]);

  // 当模式切换时重新加载对应的数据
  useEffect(() => {
    loadData();
  }, [isMarkdownMode, loadData]);

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
  }, [showHistorySidebar, setShowHistorySidebar]);

  // 自动保存
  useEffect(() => {
    if (blocks.length > 0 && !isLoading) {
      debouncedSave(blocks);
    }
  }, [blocks, isLoading, debouncedSave]);

  // 保存设置
  useEffect(() => {
    localStorage.setItem('nano-board-markdown-mode', isMarkdownMode.toString());
  }, [isMarkdownMode]);

  useEffect(() => {
    localStorage.setItem('nano-board-markdown-preview', showMarkdownPreview.toString());
  }, [showMarkdownPreview]);





  // 清理函数
  useEffect(() => {
    return () => {
      cleanupDragAndDrop();
      cleanupScrollSync();
      cleanupDataPersistence();
    };
  }, [cleanupDragAndDrop, cleanupScrollSync, cleanupDataPersistence]);

  // 当文本框布局状态改变时，立即更新所有文本框高度
  useEffect(() => {
    updateAllTextareasHeight(isSingleTextBlock);
  }, [isSingleTextBlock]); // 依赖单个文本框状态，确保即时更新















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
            onClick={() => clearAllContent(clearAllBlocks)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-red-600 border border-red-300 hover:bg-red-50 hover:border-red-400"
            title="清空所有内容"
          >
            <span className="inline-flex items-center gap-1">
              <span>清空</span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* 历史记录按钮 */}
          <button
            onClick={async () => {
              setShowHistorySidebar(!showHistorySidebar);
              if (!showHistorySidebar) {
                // 打开时刷新本地文件历史
                await refreshFileHistory(); // 刷新本地文件历史
              }
            }}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            title="查看历史记录"
            disabled={fileHistoryLoadingState.isLoading}
          >
            {fileHistoryLoadingState.isLoading ? '加载中...' : '历史'}
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

        {/* 普通模式：分块显示 - 优化文本框宽度以提升阅读体验 */}
        {!isMarkdownMode && (
          <div className="w-full h-full overflow-auto p-2">
            {/* 添加响应式左右边距，缩减文本框宽度以提升阅读体验，保持居中显示 */}
            {/* 大屏幕：左右各300px边距，中等屏幕：150px，小屏幕：20px */}
            <div className="max-w-none space-y-3 mx-auto px-5 md:px-[150px] xl:px-[300px] min-w-0">
              {blocks.map((block, index) => {
                return (
                  <div key={block.id} className="relative group">
                    {block.type === 'text' ? (
                      <div
                        className="relative"
                        onMouseEnter={() => setHoveredTextBlockId(block.id)}
                        onMouseLeave={() => setHoveredTextBlockId(null)}
                      >
                        {/* 文本框操作按钮组 - 悬停时显示 */}
                        {!isMarkdownMode && hoveredTextBlockId === block.id && (
                          <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            {/* 空文本框只显示删除按钮 */}
                            {!block.content.trim() ? (
                              <button
                                onClick={() => deleteBlock(block.id)}
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
                                  onClick={() => handleSaveText(block.content)}
                                  disabled={isSavingText}
                                  className="w-5 h-5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center font-bold"
                                  title="保存"
                                >
                                  {/* 使用简单的下箭头图标表示保存 */}
                                  {isSavingText ? '...' : '↓'}
                                </button>
                                <button
                                  onClick={() => clearTextBlockContent(block.id)}
                                  className="w-5 h-5 bg-orange-500 hover:bg-orange-600 text-white text-s rounded-md shadow-lg transition-all duration-200 flex items-center justify-center"
                                  title="清空"
                                >
                                  {/* 使用简单的循环符号表示清空重置 */}
                                  ↻
                                </button>
                                <button
                                  onClick={() => deleteBlock(block.id)}
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

                        <textarea
                          ref={(el) => {
                            if (el && focusedBlockId === block.id) {
                              // 当获得焦点时自动调整高度
                              setTimeout(() => {
                                adjustTextareaHeight(el, block.content, isSingleTextBlock);
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
                            adjustTextareaHeight(target, newContent, isSingleTextBlock);
                          }}
                          onPaste={handleImagePaste}
                          onKeyDown={(e) => handleKeyDown(e, block.id)}
                          onFocus={(e) => {
                            setFocusedBlockId(block.id);
                            // 聚焦时调整高度
                            const target = e.target as HTMLTextAreaElement;
                            setTimeout(() => {
                              adjustTextareaHeight(target, block.content, isSingleTextBlock);
                            }, 0);
                          }}
                          onBlur={() => {
                            // 图片已通过上传自动保存到文件系统，无需额外缓存操作
                          }}
                          className={cn(
                            "w-full p-3 border rounded-lg outline-none resize-none font-mono text-sm leading-relaxed bg-white textarea-no-scrollbar",
                            focusedBlockId === block.id
                              ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-20 shadow-sm"
                              : "border-gray-200 hover:border-gray-300",
                            isSingleTextBlock
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
                            height: isSingleTextBlock
                              ? '25rem'
                              : 'auto',
                            minHeight: isSingleTextBlock
                              ? '25rem'
                              : '2.5rem',
                            maxHeight: isSingleTextBlock
                              ? '25rem'
                              : '10rem',
                            overflowY: 'auto' // 启用垂直滚动，支持滚轮操作
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full text-center my-4">
                        {/* 图片容器 - 限制最大高度300px，修复删除按钮定位 */}
                        <div className="relative inline-block bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 max-w-full group">
                          {/* 图片删除按钮 - 精确定位在图片元素右上角 */}
                          <button
                            onClick={() => deleteBlock(block.id)}
                            className="absolute top-2 right-2 z-10 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                            title="删除图片"
                          >
                            <span className="text-xs font-bold">×</span>
                          </button>

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

                    {/* 新建文本框按钮 - 悬停时显示，紧贴元素边缘 */}
                    {(block.type === 'image' || (block.type === 'text' && block.content.trim())) && (
                      <div className="relative">
                        <button
                          onClick={() => addTextBlockAfter(block.id)}
                          className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 opacity-0 group-hover:opacity-100"
                          style={{
                            top: block.type === 'text' ? '-6px' : '-23px' // 紧贴文本框下边框或图片容器下边缘
                          }}
                        >
                          <span className="text-sm font-bold leading-none">+</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Markdown模式 - 改进分栏布局和同步滚动，添加与普通模式一致的边框样式 */}
        {isMarkdownMode && (
          <div className="flex w-full h-full p-2">
            {/* 编辑区域 - 添加边框容器 */}
            <div className={cn(
              'flex flex-col',
              showMarkdownPreview ? 'flex-1 mr-2' : 'w-full'
            )}>
              {/* 文本编辑区域容器 - 应用与普通模式相同的边框样式 */}
              <div className="h-full border rounded-lg bg-white border-gray-200 hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20 shadow-sm transition-all duration-200">
                <textarea
                  ref={editorRef}
                  value={blocksToContent(blocks)}
                  onChange={(e) => {
                    const newBlocks = contentToBlocks(e.target.value);
                    setBlocks(newBlocks);
                  }}
                  onPaste={handleImagePaste}
                  onKeyDown={handleMarkdownKeyDown}
                  onScroll={showMarkdownPreview ? syncScrollFromEditor : undefined}
                  onBlur={() => {
                    // 图片已通过上传自动保存到文件系统，无需额外缓存操作
                  }}
                  className="w-full h-full p-3 border-none outline-none resize-none font-mono text-sm leading-relaxed bg-transparent overflow-auto textarea-no-scrollbar rounded-lg"
                  placeholder="开始输入Markdown内容，支持粘贴图片..."
                  spellCheck={false}
                  style={{
                    minHeight: 'calc(100vh - 140px)', // 设置接近完整页面高度
                    height: 'calc(100vh - 140px)',    // 与单个文本框类似的高度
                    maxHeight: 'calc(100vh - 140px)'  // 限制最大高度
                  }}
                />
              </div>
            </div>

            {/* 预览区域 - 添加与编辑区域一致的边框样式 */}
            {showMarkdownPreview && (
              <div className="flex-1 flex flex-col ml-2">
                {/* 预览区域容器 - 应用与编辑区域相同的边框样式 */}
                <div className="h-full border rounded-lg bg-gray-50 border-gray-200 shadow-sm">
                  <div
                    ref={previewRef}
                    className="h-full overflow-auto p-3"
                    onScroll={syncScrollFromPreview}
                    style={{
                      minHeight: 'calc(100vh - 140px)', // 与编辑区域保持一致的高度
                      height: 'calc(100vh - 140px)',
                      maxHeight: 'calc(100vh - 140px)'
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* 历史侧边栏 */}
      {showHistorySidebar && (
        <div ref={sidebarRef} className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right border-l border-gray-200">
          {/* 侧边栏头部 */}
          <div className="flex flex-col border-b border-gray-200 bg-gray-50">
            {/* 标题和关闭按钮 */}
            <div className="flex items-center justify-between p-4">
              <h3 className="text-lg font-semibold text-gray-900">历史记录</h3>
              <button
                onClick={() => setShowHistorySidebar(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                title="关闭"
              >
                ×
              </button>
            </div>

            {/* 切换按钮 */}
            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setHistorySidebarType('images')}
                className={cn(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                  historySidebarType === 'images'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                )}
              >
                图片
              </button>
              <button
                onClick={() => setHistorySidebarType('texts')}
                className={cn(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors border-l border-gray-200',
                  historySidebarType === 'texts'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                )}
              >
                文本
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-auto">
            {/* 操作按钮区域 */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              {/* 加载状态显示 */}
              {fileHistoryLoadingState.isLoading && (
                <div className="flex items-center justify-center mb-3 text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-sm">扫描文件中...</span>
                </div>
              )}

              {/* 错误状态显示 */}
              {fileHistoryLoadingState.error && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {fileHistoryLoadingState.error}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="space-y-2">
                {historySidebarType === 'images' ? (
                  <button
                    onClick={() => handleClearAllLocalFiles('image')}
                    className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    title="删除所有本地图片文件"
                    disabled={fileHistoryLoadingState.isLoading}
                  >
                    删除所有图片文件
                  </button>
                ) : (
                  <button
                    onClick={() => handleClearAllLocalFiles('text')}
                    className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    title="删除所有本地文本文件"
                    disabled={fileHistoryLoadingState.isLoading}
                  >
                    删除所有本地文本文件
                  </button>
                )}

                {/* 刷新按钮 */}
                <button
                  onClick={refreshFileHistory}
                  className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  title="刷新文件列表"
                  disabled={fileHistoryLoadingState.isLoading}
                >
                  {fileHistoryLoadingState.isLoading ? '刷新中...' : '刷新列表'}
                </button>
              </div>
            </div>

            {/* 列表内容 */}
            <div className="p-4">
              {historySidebarType === 'images' ? (
                <div className="space-y-6">
                  {/* 本地图片文件列表 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      本地图片文件 ({localImageFiles.length})
                    </h4>
                    {localImageFiles.length === 0 ? (
                      <div className="text-center text-gray-400 py-4 text-sm">
                        暂无本地图片文件
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {localImageFiles.map((imageFile) => (
                          <div
                            key={imageFile.id}
                            className="border border-gray-200 rounded-lg p-3 hover:border-green-300 hover:shadow-sm hover:bg-green-50 transition-all group"
                          >
                            {/* 图片文件项头部 */}
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                                {imageFile.fileName.replace(/\.[^/.]+$/, '')}
                              </h4>
                              <div className="flex items-center gap-2 ml-2">
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  {new Date(imageFile.modifiedAt).toLocaleDateString('zh-CN', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLocalFile(imageFile.fileName, 'image');
                                  }}
                                  className="w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                  title="删除此图片文件"
                                >
                                  ×
                                </button>
                              </div>
                            </div>

                            {/* 图片预览 */}
                            <div className="mb-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageFile.filePath}
                                alt={imageFile.fileName}
                                className="w-full h-32 object-cover rounded border border-gray-200"
                              />
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleInsertLocalImageFile(imageFile.filePath, imageFile.fileName)}
                                className="flex-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
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
              ) : (
                <div className="space-y-6">
                  {/* 本地文本文件列表 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      本地文本文件 ({localTextFiles.length})
                    </h4>
                    {localTextFiles.length === 0 ? (
                      <div className="text-center text-gray-400 py-4 text-sm">
                        暂无本地文本文件
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {localTextFiles.map((textFile) => (
                          <div
                            key={textFile.id}
                            className="border border-gray-200 rounded-lg p-3 hover:border-green-300 hover:shadow-sm hover:bg-green-50 transition-all group"
                          >
                            {/* 文本文件项头部 */}
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                                {textFile.fileName.replace('.txt', '')}
                              </h4>
                              <div className="flex items-center gap-2 ml-2">
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  {new Date(textFile.modifiedAt).toLocaleDateString('zh-CN', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLocalFile(textFile.fileName, 'text');
                                  }}
                                  className="w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                  title="删除此文本文件"
                                >
                                  ×
                                </button>
                              </div>
                            </div>

                            {/* 文本预览 */}
                            <div className="mb-3">
                              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border line-clamp-3">
                                {textFile.preview}
                              </div>
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRestoreLocalTextFile(textFile.fileName)}
                                className="flex-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
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
          </div>
        </div>
      )}
    </div>
  );
};
