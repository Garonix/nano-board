/**
 * 文本管理 Hook（扩展版）
 * 支持文本粘贴、拖拽上传和文件保存功能
 */

import { useCallback } from 'react';

/**
 * 检查是否为文本文件
 * @param file 文件对象
 * @returns 是否为文本文件
 */
const isTextFile = (file: File): boolean => {
  return file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
};

/**
 * 文本管理 Hook（扩展版）
 * 支持文本粘贴、拖拽上传和文件保存功能
 * @param onInsertTextContent 插入文本内容的回调函数
 * @param refreshFileHistory 刷新文件历史的回调函数
 * @param setIsUploadingText 设置文本上传状态的回调函数
 * @param focusedBlockId 当前聚焦的文本框ID
 * @returns 文本管理相关函数
 */
export const useTextManager = (
  onInsertTextContent?: (content: string) => void,
  refreshFileHistory?: () => Promise<void>,
  setIsUploadingText?: (uploading: boolean) => void,
  focusedBlockId?: string
) => {

  /** 短文本长度阈值 - 超过此长度的文本将保存为文件 */
  const SHORT_TEXT_THRESHOLD = 500;

  /**
   * 保存文本内容到独立文件
   * @param content 文本内容
   * @returns Promise<boolean> 保存是否成功
   */
  const saveTextToFile = useCallback(async (content: string): Promise<boolean> => {
    if (!content.trim()) {
      return false;
    }

    try {
      const response = await fetch('/api/save-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (_error) {
      return false;
    }
  }, []);

  /**
   * 上传文本文件到服务器
   * @param file 文本文件对象
   * @returns Promise<boolean> 上传是否成功
   */
  const uploadTextFile = useCallback(async (file: File): Promise<boolean> => {
    if (!isTextFile(file)) return false;

    try {
      const content = await file.text();
      return await saveTextToFile(content);
    } catch (error) {
      console.error('读取文本文件失败:', error);
      return false;
    }
  }, [saveTextToFile]);

  /**
   * 处理文本粘贴事件
   * @param e 粘贴事件对象
   * @param shouldCreateNewBlock 是否应该创建新的文本框（当没有聚焦的文本框时）
   */
  const handleTextPaste = useCallback(async (e: React.ClipboardEvent, shouldCreateNewBlock: boolean = true) => {
    // 获取粘贴的文本内容
    const textContent = e.clipboardData.getData('text/plain');

    if (textContent && textContent.trim()) {
      // 如果有聚焦的文本框且不需要创建新文本框，使用默认粘贴行为（插入到光标位置）
      if (focusedBlockId && focusedBlockId.trim() !== '' && !shouldCreateNewBlock) {
        // 不阻止默认行为，让浏览器处理粘贴到光标位置
        return;
      }

      // 如果文本内容较长，自动保存为文件
      if (textContent.length > SHORT_TEXT_THRESHOLD) {
        e.preventDefault();

        if (setIsUploadingText) {
          setIsUploadingText(true);
        }

        try {
          const success = await saveTextToFile(textContent);
          if (success && refreshFileHistory) {
            await refreshFileHistory();
          }
        } finally {
          if (setIsUploadingText) {
            setIsUploadingText(false);
          }
        }
      } else if (shouldCreateNewBlock) {
        // 短文本且需要创建新文本框：阻止默认粘贴行为，通过回调函数在白板中创建文本框
        e.preventDefault();

        if (onInsertTextContent) {
          onInsertTextContent(textContent);
        }
      }
      // 如果是短文本但不需要创建新文本框（在聚焦文本框内），则使用默认粘贴行为
    }
  }, [saveTextToFile, refreshFileHistory, setIsUploadingText, onInsertTextContent, focusedBlockId]);

  /**
   * 处理文本拖拽事件（支持文本内容和文本文件）
   * @param e 拖拽事件对象
   */
  const handleTextDragDrop = useCallback(async (e: React.DragEvent) => {
    // 首先检查是否有文本内容被拖拽
    const textContent = e.dataTransfer.getData('text/plain');

    if (textContent && textContent.trim()) {
      // 处理拖拽的文本内容
      if (textContent.length > SHORT_TEXT_THRESHOLD) {
        // 长文本保存为文件
        if (setIsUploadingText) {
          setIsUploadingText(true);
        }

        try {
          const success = await saveTextToFile(textContent);
          if (success && refreshFileHistory) {
            await refreshFileHistory();
          }
        } finally {
          if (setIsUploadingText) {
            setIsUploadingText(false);
          }
        }
      } else {
        // 短文本在白板中创建文本框
        if (onInsertTextContent) {
          onInsertTextContent(textContent);
        }
      }
      return;
    }

    // 如果没有文本内容，检查是否有文本文件
    const files = Array.from(e.dataTransfer.files);
    await handleTextFileDrop(files);
  }, [saveTextToFile, refreshFileHistory, setIsUploadingText, onInsertTextContent]);

  /**
   * 处理文本文件拖拽上传
   * @param files 文件列表
   */
  const handleTextFileDrop = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    const textFiles = fileArray.filter(isTextFile);

    if (textFiles.length === 0) return;

    if (setIsUploadingText) {
      setIsUploadingText(true);
    }

    try {
      for (const file of textFiles) {
        const content = await file.text();

        // 保存文本文件到服务器
        const success = await saveTextToFile(content);

        if (success) {
          console.log(`文本文件上传成功: ${file.name}`);
        }
      }

      // 上传完成后刷新文件历史
      if (refreshFileHistory) {
        await refreshFileHistory();
      }
    } catch (error) {
      console.error('文本文件上传失败:', error);
    } finally {
      if (setIsUploadingText) {
        setIsUploadingText(false);
      }
    }
  }, [saveTextToFile, refreshFileHistory, setIsUploadingText]);

  /**
   * 处理文本文件拖拽上传（向后兼容）
   * @param files 文件列表
   */
  const handleTextDrop = useCallback(async (files: FileList | File[]) => {
    await handleTextFileDrop(files);
  }, [handleTextFileDrop]);

  return {
    saveTextToFile,
    uploadTextFile,
    handleTextPaste,
    handleTextDrop,
    handleTextDragDrop,
    handleTextFileDrop,
    isTextFile
  };
};
