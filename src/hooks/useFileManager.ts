/**
 * 文件管理Hook
 */

import { useCallback } from 'react';
import { ContentBlock } from '@/types';
import { AlertOptions } from '@/hooks/useDialog';
import { isGeneralFile, generateFileId } from '@/lib/utils';
import { autoScrollToNewContent } from '@/lib/textareaUtils';


export const useFileManager = (
  setBlocks: (blocks: ContentBlock[] | ((prev: ContentBlock[]) => ContentBlock[])) => void,
  isMarkdownMode: boolean,
  setIsUploadingFile: (loading: boolean) => void,
  refreshFileHistory?: () => Promise<void>,
  saveOnFileInsert?: (blockId: string) => Promise<void>,
  alert?: (options: AlertOptions) => Promise<void>
) => {

  /**
   * 在普通模式下将文件添加到页面末尾（优化空文本框处理）
   * @param fileName 文件名
   * @param fileSize 文件大小
   * @param mimeType MIME类型
   * @param extension 文件扩展名
   * @param downloadPath 下载路径
   */
  const insertFileAtEnd = useCallback(async (
    fileName: string,
    fileSize: number,
    mimeType: string,
    extension: string,
    downloadPath: string
  ) => {
    const fileId = generateFileId();

    setBlocks(prev => {
      const newBlocks = [...prev];

      if (newBlocks.length > 0) {
        const lastBlock = newBlocks[newBlocks.length - 1];
        if (lastBlock.type === 'text' &&
            (lastBlock.content === '' || lastBlock.content.trim() === '')) {
          console.log('删除末尾的空文本框，为文件插入做准备');
          newBlocks.pop();
        }
      }

      const fileBlock: ContentBlock = {
        id: fileId,
        type: 'file',
        content: downloadPath,
        fileName,
        fileSize,
        mimeType,
        extension
      };

      newBlocks.push(fileBlock);
      console.log(`普通模式文件块已插入，ID: ${fileId}, 文件名: ${fileName}`);

      return newBlocks;
    });

    autoScrollToNewContent(fileId, 200);

    if (saveOnFileInsert) {
      setTimeout(async () => {
        await saveOnFileInsert(fileId);
      }, 100);
    }
  }, [setBlocks, saveOnFileInsert]);
   */
  const uploadFile = useCallback(async (file: File): Promise<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    extension: string;
    downloadPath: string;
  } | null> => {
    if (!isGeneralFile(file)) return null;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return {
          fileName: result.fileName,
          fileSize: result.size,
          mimeType: result.mimeType,
          extension: result.extension,
          downloadPath: result.downloadPath
        };
      } else {
        const error = await response.json();
        throw new Error(error.error || '文件上传失败');
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  }, []);

  const insertFile = useCallback(async (
    fileName: string,
    fileSize: number,
    mimeType: string,
    extension: string,
    downloadPath: string
  ) => {
    if (!isMarkdownMode) {
      await insertFileAtEnd(fileName, fileSize, mimeType, extension, downloadPath);
    }
  }, [isMarkdownMode, insertFileAtEnd]);

  const handleFileDrop = useCallback(async (files: FileList) => {
    if (isMarkdownMode) return;

    const fileArray = Array.from(files);
    const generalFiles = fileArray.filter(isGeneralFile);

    if (generalFiles.length === 0) return;

    setIsUploadingFile(true);

    try {
      // 逐个上传文件
      for (const file of generalFiles) {
        try {
          const uploadResult = await uploadFile(file);
          if (uploadResult) {
            await insertFile(
              uploadResult.fileName,
              uploadResult.fileSize,
              uploadResult.mimeType,
              uploadResult.extension,
              uploadResult.downloadPath
            );
          }
        } catch (error) {
          console.error(`文件 ${file.name} 上传失败:`, error);
          if (alert) {
            await alert({
              message: `文件 ${file.name} 上传失败: ${error instanceof Error ? error.message : '未知错误'}`,
              type: 'error'
            });
          }
        }
      }

      // 刷新文件历史
      if (refreshFileHistory) {
        await refreshFileHistory();
      }
    } finally {
      setIsUploadingFile(false);
    }
  }, [isMarkdownMode, setIsUploadingFile, uploadFile, insertFile, refreshFileHistory]);

  /**
   * 处理文件下载 - 优化下载逻辑，避免代理问题
   * @param fileName 文件名
   */
  const handleFileDownload = useCallback(async (fileName: string) => {
    try {
      const downloadUrl = `/api/files/download?fileName=${encodeURIComponent(fileName)}&download=true`;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (alert) {
        await alert({
          message: `文件 "${fileName}" 下载已开始`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error('文件下载失败:', error);
      if (alert) {
        await alert({
          message: `文件下载失败: ${error instanceof Error ? error.message : '未知错误'}`,
          type: 'error'
        });
      }
    }
  }, [alert]);

  return {
    handleFileDrop,
    handleFileDownload,
    uploadFile,
    insertFile
  };
};
