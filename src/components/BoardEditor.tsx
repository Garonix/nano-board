/**
 * 简单白板编辑器
 * 普通模式：大文本框，支持文字和图片粘贴
 * Markdown模式：支持Markdown语法
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn, formatTimestamp, saveImagesToCache } from '@/lib/utils';
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

export const BoardEditor: React.FC<BoardEditorProps> = ({ className }) => {
  // 使用自定义 Hooks 管理状态和逻辑
  const {
    editorState,
    hasImageBlocks,
    setBlocks,
    setIsMarkdownMode,
    setShowMarkdownPreview,
    setIsLoading,
    setIsUploadingImage,
    setIsDragOver,
    setFocusedBlockId,
    setShowHistorySidebar,
    setHistorySidebarType,
    setCachedImages,
    setTextHistory,
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
    cachedImages,
    textHistory
  } = editorState;

  // 内容转换 Hook
  const { blocksToContent, contentToBlocks, extractImagesFromBlocks } = useContentConverter(isMarkdownMode);

  // 图片管理 Hook
  const {
    saveImagesToCacheDebounced,
    loadCachedImages,
    handleImagePaste,
    handleImageDrop,
    restoreImageFromCache,
    handleClearImageCache,
    handleRemoveImageFromCache
  } = useImageManager(
    blocks,
    setBlocks,
    isMarkdownMode,
    focusedBlockId,
    contentToBlocks,
    extractImagesFromBlocks,
    setCachedImages,
    setIsUploadingImage
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

  // 文本管理 Hook
  const {
    saveTextToFile,
    loadTextHistory,
    getTextContent,
    deleteTextFile,
    clearAllTextFiles
  } = useTextManager(setTextHistory);

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

  // 处理从文本历史恢复内容
  const handleRestoreTextFromHistory = async (fileName: string) => {
    try {
      const content = await getTextContent(fileName);
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
        alert('无法读取文本内容');
      }
    } catch (error) {
      console.error('恢复文本时发生错误:', error);
      alert('恢复文本失败，请重试');
    }
  };













  // 初始化
  useEffect(() => {
    loadCachedImages(); // 加载图片缓存
    loadTextHistory(); // 加载文本历史

    // 加载保存的设置
    const savedMode = localStorage.getItem('nano-board-markdown-mode');
    const savedPreview = localStorage.getItem('nano-board-markdown-preview');
    if (savedMode) setIsMarkdownMode(savedMode === 'true');
    if (savedPreview) setShowMarkdownPreview(savedPreview === 'true');
  }, [loadCachedImages, loadTextHistory, setIsMarkdownMode, setShowMarkdownPreview]);

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
      saveImagesToCacheDebounced();
    }
  }, [blocks, isLoading, debouncedSave, saveImagesToCacheDebounced]);

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

  // 当图片状态改变时，立即更新所有文本框高度
  useEffect(() => {
    updateAllTextareasHeight(hasImageBlocks);
  }, [hasImageBlocks]); // 依赖图片状态，确保即时更新















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
            onClick={() => {
              setShowHistorySidebar(!showHistorySidebar);
              if (!showHistorySidebar) {
                loadCachedImages(); // 打开时刷新图片缓存
                loadTextHistory(); // 打开时刷新文本历史
              }
            }}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            title="查看历史记录"
          >
            历史
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
                                ×
                              </button>
                            ) : (
                              // 非空文本框显示完整按钮组
                              <>
                                <button
                                  onClick={() => handleSaveText(block.content)}
                                  disabled={isSavingText}
                                  className="w-5 h-5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center"
                                  title="保存此文本到文件"
                                >
                                  {isSavingText ? '...' : '💾'}
                                </button>
                                <button
                                  onClick={() => clearTextBlockContent(block.id)}
                                  className="w-5 h-5 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center"
                                  title="清空此文本框内容"
                                >
                                  🗑️
                                </button>
                                <button
                                  onClick={() => deleteBlock(block.id)}
                                  className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center"
                                  title="删除此文本框"
                                >
                                  ×
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
                                adjustTextareaHeight(el, block.content, hasImageBlocks);
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
                            adjustTextareaHeight(target, newContent, hasImageBlocks);
                          }}
                          onPaste={handleImagePaste}
                          onKeyDown={(e) => handleKeyDown(e, block.id)}
                          onFocus={(e) => {
                            setFocusedBlockId(block.id);
                            // 聚焦时调整高度
                            const target = e.target as HTMLTextAreaElement;
                            setTimeout(() => {
                              adjustTextareaHeight(target, block.content, hasImageBlocks);
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
                          title="在下方新建文本框"
                          style={{
                            top: block.type === 'text' ? '-5px' : '-23px' // 紧贴文本框下边框或图片容器下边缘
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
                onPaste={handleImagePaste}
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
              {historySidebarType === 'images' ? (
                <button
                  onClick={() => handleClearImageCache(cachedImages)}
                  className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  title="清除所有图片缓存"
                >
                  清除所有图片缓存
                </button>
              ) : (
                <button
                  onClick={() => clearAllTextFiles(textHistory)}
                  className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  title="删除所有文本文件"
                >
                  删除所有文本文件
                </button>
              )}
            </div>

            {/* 列表内容 */}
            <div className="p-4">
              {historySidebarType === 'images' ? (
                // 图片缓存列表
                cachedImages.length === 0 ? (
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
                )
              ) : (
                // 文本历史列表
                textHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-4">📝</div>
                    <p>暂无保存的文本</p>
                    <p className="text-sm mt-2">使用保存按钮保存文本后会显示在这里</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {textHistory.map((textItem) => (
                      <div
                        key={textItem.id}
                        className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm hover:bg-blue-50 transition-all group"
                      >
                        {/* 文本项头部 */}
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                            {textItem.fileName.replace('.txt', '')}
                          </h4>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {new Date(textItem.createdAt).toLocaleDateString('zh-CN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('确定要删除这个文本文件吗？')) {
                                  deleteTextFile(textItem.fileName);
                                }
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
                            {textItem.preview}
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRestoreTextFromHistory(textItem.fileName)}
                            className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                          >
                            插入到编辑器
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
