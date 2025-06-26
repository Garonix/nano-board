/**
 * 简单白板编辑器
 * 普通模式：大文本框，支持文字和图片粘贴
 * Markdown模式：支持Markdown语法
 */

'use client';

import React, { useEffect, useState } from 'react';
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
import { useTextManager } from '@/hooks/useTextManager';
import { useFileHistoryManager } from '@/hooks/useFileHistoryManager';

// 组件
import { HistorySidebar } from './HistorySidebar';
import { TopNavbar } from './TopNavbar';
import { NormalModeEditor } from './NormalModeEditor';
import { MarkdownModeEditor } from './MarkdownModeEditor';

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

  // 文件历史管理 Hook（简化版）
  const {
    refreshFileHistory,
    getTextFileContent,
    deleteFile,
    clearAllFiles
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



  // 引用（sidebarRef 已移除，由 HistorySidebar 组件内部管理）

  // 文本保存按钮状态
  const [hoveredTextBlockId, setHoveredTextBlockId] = useState<string | null>(null);
  const [isSavingText, setIsSavingText] = useState(false);

  // 处理文本保存（移除alert提示）
  const handleSaveText = async (content: string) => {
    if (!content.trim()) {
      console.warn('不能保存空白内容');
      return;
    }

    setIsSavingText(true);
    try {
      const success = await saveTextToFile(content);
      if (success) {
        console.log('文本保存成功');
      } else {
        console.error('文本保存失败');
      }
    } catch (error) {
      console.error('保存文本时发生错误:', error);
    } finally {
      setIsSavingText(false);
    }
  };

  // 注意：文本历史恢复功能已移除，统一使用本地文件恢复

  // 处理从本地文本文件恢复内容（移除alert提示）
  const handleRestoreLocalTextFile = async (fileName: string) => {
    try {
      const content = await getTextFileContent(fileName);
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
        console.log(`文本文件恢复成功: ${fileName}`);
      } else {
        console.error(`无法读取本地文本文件内容: ${fileName}`);
      }
    } catch (error) {
      console.error('恢复本地文本文件时发生错误:', error);
    }
  };

  // 处理插入图片缓存
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
      console.log(`图片缓存插入成功: ${fileName}`);
    } catch (error) {
      console.error('插入图片缓存时发生错误:', error);
    }
  };

  // 处理删除本地文件（移除确认提示和alert）
  const handleDeleteLocalFile = async (fileName: string, fileType: 'image' | 'text') => {
    try {
      const success = await deleteFile(fileName, fileType);
      if (success) {
        // 刷新文件历史
        await refreshFileHistory();
        console.log(`${fileType === 'image' ? '图片' : '文本'}文件删除成功: ${fileName}`);
      } else {
        console.error(`${fileType === 'image' ? '图片' : '文本'}文件删除失败: ${fileName}`);
      }
    } catch (error) {
      console.error('删除本地文件时发生错误:', error);
    }
  };

  // 处理清除所有本地文件（保留确认提示，移除结果alert）
  const handleClearAllLocalFiles = async (fileType: 'image' | 'text') => {
    // 保留危险操作的确认提示
    if (!window.confirm(`确定要删除所有${fileType === 'image' ? '图片' : '文本'}文件吗？此操作无法撤销。`)) {
      return;
    }

    try {
      const success = await clearAllFiles(fileType);
      if (success) {
        // 刷新文件历史
        await refreshFileHistory();
        console.log(`所有${fileType === 'image' ? '图片' : '文本'}文件清除成功`);
      } else {
        console.error(`清除${fileType === 'image' ? '图片' : '文本'}文件失败`);
      }
    } catch (error) {
      console.error('清除本地文件时发生错误:', error);
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

        {/* 普通模式编辑器 */}
        {!isMarkdownMode && (
          <NormalModeEditor
            blocks={blocks}
            focusedBlockId={focusedBlockId}
            isSingleTextBlock={isSingleTextBlock}
            isSavingText={isSavingText}
            hoveredTextBlockId={hoveredTextBlockId}
            onUpdateBlockContent={updateBlockContent}
            onDeleteBlock={deleteBlock}
            onAddTextBlockAfter={addTextBlockAfter}
            onClearTextBlockContent={clearTextBlockContent}
            onSetFocusedBlockId={setFocusedBlockId}
            onSetHoveredTextBlockId={setHoveredTextBlockId}
            onHandleImagePaste={handleImagePaste}
            onHandleKeyDown={handleKeyDown}
            onHandleSaveText={handleSaveText}
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
          handleInsertLocalImageFile(imageSrc, fileName);
        }}
        onTextInsert={handleRestoreLocalTextFile}
        onFileDelete={handleDeleteLocalFile}
        onClearAll={handleClearAllLocalFiles}
      />
    </div>
  );
};
