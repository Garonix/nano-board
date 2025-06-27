/**
 * 简单白板编辑器
 * 普通模式：大文本框，支持文字和图片粘贴
 * Markdown模式：支持Markdown语法
 */

'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { BoardEditorProps } from '@/types';
import { updateAllTextareasHeight } from '@/lib/textareaUtils';

// 自定义 Hooks
import { useEditorState } from '@/hooks/useEditorState';
import { useContentConverter } from '@/hooks/useContentConverter';
import { useImageManager } from '@/hooks/useImageManager';
import { useScrollSync } from '@/hooks/useScrollSync';
import { useDataPersistence } from '@/hooks/useDataPersistence';
import { useKeyboardHandlers } from '@/hooks/useKeyboardHandlers';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';

import { useFileHistoryManager } from '@/hooks/useFileHistoryManager';

// 组件
import { HistorySidebar } from './HistorySidebar';
import { TopNavbar } from './TopNavbar';
import { NormalModeEditor } from './NormalModeEditor';
import { MarkdownModeEditor } from './MarkdownModeEditor';
import { FileOperationsManager } from './FileOperationsManager';

import { DragDropOverlay } from './DragDropOverlay';
import { LoadingSpinner } from './LoadingSpinner';

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

  // 文件历史管理 Hook（简化版）
  const {
    refreshFileHistory
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
    setIsLoading
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

  // 引用（sidebarRef 已移除，由 HistorySidebar 组件内部管理）

  // 初始化 - 加载设置并加载数据
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

    // 加载数据
    loadData();
  }, []); // 只在组件挂载时执行一次

  // 当模式切换时重新加载数据
  useEffect(() => {
    loadData();
  }, [isMarkdownMode, loadData]);

  // 点击外部关闭侧边栏的逻辑已移至 HistorySidebar 组件内部

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
    return <LoadingSpinner message="加载中..." />;
  }

  return (
    <FileOperationsManager
      isMarkdownMode={isMarkdownMode}
      blocks={blocks}
      contentToBlocks={contentToBlocks}
      blocksToContent={blocksToContent}
      onSetBlocks={setBlocks}
      onInsertTextContent={insertTextContent}
      onCloseHistorySidebar={() => setShowHistorySidebar(false)}
      onRefreshFileHistory={refreshFileHistory}
    >
      {(fileOperations) => (
        <div className={cn('h-screen flex flex-col bg-white', className)}>
          {/* 顶部导航栏 */}
          <TopNavbar
            isMarkdownMode={isMarkdownMode}
            showMarkdownPreview={showMarkdownPreview}
            isUploadingImage={isUploadingImage}
            fileHistoryLoadingState={fileHistoryLoadingState}
            onToggleMarkdownMode={() => setIsMarkdownMode(!isMarkdownMode)}
            onToggleMarkdownPreview={() => setShowMarkdownPreview(!showMarkdownPreview)}
            onClearAllContent={() => clearAllContent(clearAllBlocks)}
            onToggleHistorySidebar={async () => {
              setShowHistorySidebar(!showHistorySidebar);
              if (!showHistorySidebar) {
                // 打开时刷新本地文件历史
                await refreshFileHistory(); // 刷新本地文件历史
              }
            }}
          />

          {/* 简单的主编辑区域 */}
          <div
            className="flex-1 flex overflow-hidden relative bg-white"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* 拖拽提示覆盖层 */}
            <DragDropOverlay isDragOver={isDragOver} />

            {/* 普通模式编辑器 */}
            {!isMarkdownMode && (
              <NormalModeEditor
                blocks={blocks}
                focusedBlockId={focusedBlockId}
                isSingleTextBlock={isSingleTextBlock}
                isSavingText={fileOperations.isSavingText}
                onUpdateBlockContent={updateBlockContent}
                onDeleteBlock={deleteBlock}
                onAddTextBlockAfter={addTextBlockAfter}
                onClearTextBlockContent={clearTextBlockContent}
                onSetFocusedBlockId={setFocusedBlockId}
                onHandleImagePaste={handleImagePaste}
                onHandleKeyDown={handleKeyDown}
                onHandleSaveText={fileOperations.handleSaveText}
              />
            )}

            {/* Markdown 模式编辑器 */}
            {isMarkdownMode && (
              <MarkdownModeEditor
                blocks={blocks}
                showMarkdownPreview={showMarkdownPreview}
                editorRef={editorRef}
                previewRef={previewRef}
                blocksToContent={blocksToContent}
                contentToBlocks={contentToBlocks}
                onSetBlocks={setBlocks}
                onHandleImagePaste={handleImagePaste}
                onHandleMarkdownKeyDown={handleMarkdownKeyDown}
                onSyncScrollFromEditor={showMarkdownPreview ? syncScrollFromEditor : undefined}
                onSyncScrollFromPreview={syncScrollFromPreview}
              />
            )}
          </div>

          {/* 历史侧边栏 - 使用独立组件 */}
          <HistorySidebar
            isVisible={showHistorySidebar}
            onClose={() => setShowHistorySidebar(false)}
            sidebarType={historySidebarType}
            onSidebarTypeChange={setHistorySidebarType}
            imageFiles={localImageFiles}
            textFiles={localTextFiles}
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
            onFileDelete={fileOperations.handleDeleteLocalFile}
            onClearAll={fileOperations.handleClearAllLocalFiles}
          />
        </div>
      )}
    </FileOperationsManager>
  );
};
