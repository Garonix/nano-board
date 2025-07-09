/**
 * 文本管理 Hook
 */

import { useCallback } from 'react';

const isTextFile = (file: File): boolean => {
  return file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
};

export const useTextManager = (
  onInsertTextContent?: (content: string) => void,
  refreshFileHistory?: () => Promise<void>,
  setIsUploadingText?: (uploading: boolean) => void,
  focusedBlockId?: string
) => {

  const SHORT_TEXT_THRESHOLD = 500;

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
      if (focusedBlockId && focusedBlockId.trim() !== '' && !shouldCreateNewBlock) {
        return;
      }

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
        e.preventDefault();

        if (onInsertTextContent) {
          onInsertTextContent(textContent);
        }
      }
    }
  }, [saveTextToFile, refreshFileHistory, setIsUploadingText, onInsertTextContent, focusedBlockId]);

  const handleTextDragDrop = useCallback(async (e: React.DragEvent) => {
    const textContent = e.dataTransfer.getData('text/plain');

    if (textContent && textContent.trim()) {
      if (textContent.length > SHORT_TEXT_THRESHOLD) {
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
