/**
 * 编辑器状态管理Hook
 * @description 统一管理编辑器的核心状态、UI状态和文件状态
 */

import { useState, useCallback, useMemo } from 'react';
import {
  ContentBlock,
  EditorState,
  HistorySidebarType,
  LocalImageFileItem,
  LocalTextFileItem,
  LocalGeneralFileItem,
  FileHistoryLoadingState
} from '@/types';

/** 核心编辑器状态 */
interface CoreState {
  blocks: ContentBlock[];
  focusedBlockId: string;
  isMarkdownMode: boolean;
}

/** UI交互状态 */
interface UIState {
  isLoading: boolean;
  isUploadingImage: boolean;
  isUploadingFile: boolean;  // 新增文件上传状态
  isUploadingText: boolean;  // 新增文本上传状态
  isDragOver: boolean;
  showMarkdownPreview: boolean;
  showHistorySidebar: boolean;
  historySidebarType: HistorySidebarType;
}

/** 文件历史状态 */
interface FileState {
  localImageFiles: LocalImageFileItem[];
  localTextFiles: LocalTextFileItem[];
  localGeneralFiles: LocalGeneralFileItem[];  // 新增通用文件列表
  fileHistoryLoadingState: FileHistoryLoadingState;
}

/**
 * 编辑器状态管理 Hook - 简洁优化版本
 */
export const useEditorState = () => {
  // ==================== 分组状态管理 ====================
  
  // 核心状态组（高频更新）
  const [coreState, setCoreState] = useState<CoreState>({
    blocks: [{ id: '1', type: 'text', content: '' }],
    focusedBlockId: '1',
    isMarkdownMode: false,
  });

  const [uiState, setUIState] = useState<UIState>({
    isLoading: true,
    isUploadingImage: false,
    isUploadingFile: false,  // 初始化文件上传状态
    isUploadingText: false,  // 初始化文本上传状态
    isDragOver: false,
    showMarkdownPreview: false,
    showHistorySidebar: false,
    historySidebarType: 'images',
  });

  const [fileState, setFileState] = useState<FileState>({
    localImageFiles: [],
    localTextFiles: [],
    localGeneralFiles: [],  // 初始化通用文件列表
    fileHistoryLoadingState: {
      isLoading: false,
      error: null,
      lastUpdated: null,
    },
  });

  /** 批量更新核心状态 */
  const updateCore = useCallback((updates: Partial<CoreState>) => {
    setCoreState(prev => ({ ...prev, ...updates }));
  }, []);

  /** 批量更新UI状态 */
  const updateUI = useCallback((updates: Partial<UIState>) => {
    setUIState(prev => ({ ...prev, ...updates }));
  }, []);

  /** 批量更新文件状态 */
  const updateFile = useCallback((updates: Partial<FileState>) => {
    setFileState(prev => ({ ...prev, ...updates }));
  }, []);

  /** 检查是否为单个文本框场景 */
  const isSingleTextBlock = useMemo(() =>
    coreState.blocks.length === 1 &&
    coreState.blocks[0].type === 'text' &&
    !coreState.blocks.some(block => block.type === 'image' || block.type === 'file'),
    [coreState.blocks]
  );

  // 向后兼容的状态对象
  const editorState: EditorState = useMemo(() => ({
    ...coreState,
    ...uiState,
    ...fileState,
  }), [coreState, uiState, fileState]);

  // ==================== 业务逻辑函数 ====================
  
  // 更新文本块内容
  const updateBlockContent = useCallback((blockId: string, content: string) => {
    setCoreState(prev => ({
      ...prev,
      blocks: prev.blocks.map(block =>
        block.id === blockId ? { ...block, content } : block
      ),
    }));
  }, []);

  // 删除指定块
  const deleteBlock = useCallback((blockId: string) => {
    setCoreState(prev => {
      const blockIndex = prev.blocks.findIndex(block => block.id === blockId);
      if (blockIndex === -1) return prev;

      const newBlocks = [...prev.blocks];
      newBlocks.splice(blockIndex, 1);

      // 确保至少有一个文本块
      if (newBlocks.length === 0) {
        const newTextBlock: ContentBlock = {
          id: Date.now().toString(),
          type: 'text',
          content: ''
        };
        return {
          ...prev,
          blocks: [newTextBlock],
          focusedBlockId: newTextBlock.id,
        };
      }

      return {
        ...prev,
        blocks: newBlocks,
        focusedBlockId: '',
      };
    });
  }, []);

  // 添加新文本框到指定位置
  const addTextBlockAfter = useCallback((afterBlockId: string) => {
    const newTextBlock: ContentBlock = {
      id: Date.now().toString(),
      type: 'text',
      content: ''
    };

    setCoreState(prev => {
      const afterIndex = prev.blocks.findIndex(block => block.id === afterBlockId);
      if (afterIndex === -1) return prev;

      const newBlocks = [...prev.blocks];
      newBlocks.splice(afterIndex + 1, 0, newTextBlock);

      return {
        ...prev,
        blocks: newBlocks,
        focusedBlockId: newTextBlock.id,
      };
    });
  }, []);

  // 清空所有内容
  const clearAllBlocks = useCallback(() => {
    const newTextBlock: ContentBlock = {
      id: Date.now().toString(),
      type: 'text',
      content: ''
    };
    
    updateCore({
      blocks: [newTextBlock],
      focusedBlockId: newTextBlock.id,
    });
  }, [updateCore]);

  // 智能插入文本内容
  const insertTextContent = useCallback((content: string) => {
    const emptyTextBlock = coreState.blocks.find(
      block => block.type === 'text' && block.content.trim() === ''
    );

    if (emptyTextBlock) {
      // 使用现有空文本框
      updateCore({
        blocks: coreState.blocks.map(block =>
          block.id === emptyTextBlock.id ? { ...block, content } : block
        ),
        focusedBlockId: emptyTextBlock.id,
      });
    } else {
      // 创建新文本框
      const newTextBlock: ContentBlock = {
        id: Date.now().toString(),
        type: 'text',
        content
      };
      
      updateCore({
        blocks: [...coreState.blocks, newTextBlock],
        focusedBlockId: newTextBlock.id,
      });
    }
  }, [coreState.blocks, updateCore]);

  // ==================== 向后兼容的setter函数 ====================
  
  const setBlocks = useCallback((blocks: ContentBlock[]) => {
    updateCore({ blocks });
  }, [updateCore]);

  const setIsMarkdownMode = useCallback((isMarkdownMode: boolean) => {
    updateCore({ isMarkdownMode });
  }, [updateCore]);

  const setShowMarkdownPreview = useCallback((showMarkdownPreview: boolean) => {
    updateUI({ showMarkdownPreview });
  }, [updateUI]);

  const setIsLoading = useCallback((isLoading: boolean) => {
    updateUI({ isLoading });
  }, [updateUI]);

  const setIsUploadingImage = useCallback((isUploadingImage: boolean) => {
    updateUI({ isUploadingImage });
  }, [updateUI]);

  const setIsUploadingFile = useCallback((isUploadingFile: boolean) => {
    updateUI({ isUploadingFile });
  }, [updateUI]);

  const setIsUploadingText = useCallback((isUploadingText: boolean) => {
    updateUI({ isUploadingText });
  }, [updateUI]);

  const setIsDragOver = useCallback((isDragOver: boolean) => {
    updateUI({ isDragOver });
  }, [updateUI]);

  const setFocusedBlockId = useCallback((focusedBlockId: string) => {
    updateCore({ focusedBlockId });
  }, [updateCore]);

  const setShowHistorySidebar = useCallback((showHistorySidebar: boolean) => {
    updateUI({ showHistorySidebar });
  }, [updateUI]);

  const setHistorySidebarType = useCallback((historySidebarType: HistorySidebarType) => {
    updateUI({ historySidebarType });
  }, [updateUI]);

  const setLocalImageFiles = useCallback((localImageFiles: LocalImageFileItem[]) => {
    updateFile({ localImageFiles });
  }, [updateFile]);

  const setLocalTextFiles = useCallback((localTextFiles: LocalTextFileItem[]) => {
    updateFile({ localTextFiles });
  }, [updateFile]);

  const setLocalGeneralFiles = useCallback((localGeneralFiles: LocalGeneralFileItem[]) => {
    updateFile({ localGeneralFiles });
  }, [updateFile]);

  const setFileHistoryLoadingState = useCallback((fileHistoryLoadingState: FileHistoryLoadingState) => {
    updateFile({ fileHistoryLoadingState });
  }, [updateFile]);

  // ==================== 返回值 ====================
  
  return {
    editorState,
    isSingleTextBlock,

    updateCore,
    updateUI,
    updateFile,

    setBlocks,
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

    updateBlockContent,
    deleteBlock,
    addTextBlockAfter,
    clearAllBlocks,
    insertTextContent,

    findFirstEmptyTextBlock: useCallback((blocks: ContentBlock[]) =>
      blocks.find(block => block.type === 'text' && block.content.trim() === '') || null,
    []),
    
    ensureMinimumTextBlock: useCallback((blocks: ContentBlock[]) => {
      if (!coreState.isMarkdownMode && blocks.length === 0) {
        return [{ id: Date.now().toString(), type: 'text', content: '' }];
      }
      return blocks;
    }, [coreState.isMarkdownMode]),

    syncBlocksAfterModeSwitch: useCallback((newBlocks: ContentBlock[]) => {
      const syncedBlocks = newBlocks.length === 0 && !coreState.isMarkdownMode
        ? [{ id: Date.now().toString(), type: 'text' as const, content: '' }]
        : newBlocks;

      const firstTextBlock = syncedBlocks.find(block => block.type === 'text');

      updateCore({
        blocks: syncedBlocks,
        focusedBlockId: firstTextBlock ? firstTextBlock.id : '',
      });
    }, [coreState.isMarkdownMode, updateCore]),

    deleteEmptyTextBlock: useCallback((blockId: string) => {
      if (coreState.blocks.length <= 1) return;
      
      const block = coreState.blocks.find(b => b.id === blockId);
      if (!block || block.type !== 'text' || block.content.trim()) return;

      deleteBlock(blockId);
    }, [coreState.blocks, deleteBlock]),

    clearTextBlockContent: useCallback((blockId: string) => {
      updateCore({
        blocks: coreState.blocks.map(block =>
          block.id === blockId && block.type === 'text'
            ? { ...block, content: '' }
            : block
        ),
        focusedBlockId: blockId,
      });
    }, [coreState.blocks, updateCore]),
  };
};
