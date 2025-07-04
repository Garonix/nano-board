/**
 * 文件管理Hook
 * @description 参考useImageManager实现，处理文件的拖拽上传、插入和管理功能
 */

import { useCallback } from 'react';
import { ContentBlock } from '@/types';
import { AlertOptions } from '@/hooks/useDialog';
import { isGeneralFile, generateFileId } from '@/lib/utils';
import { autoScrollToNewContent } from '@/lib/textareaUtils';

/**
 * 文件管理Hook
 * @param setBlocks 设置内容块函数
 * @param isMarkdownMode 是否为Markdown模式
 * @param setIsUploadingFile 设置文件上传状态函数
 * @param refreshFileHistory 刷新文件历史函数
 * @param saveOnFileInsert 文件插入后的保存函数
 * @param alert 错误提示函数
 * @returns 文件管理相关函数
 */
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

      // 优化空文本框处理逻辑
      // 检查最后一个块是否为空文本框，如果是则删除
      if (newBlocks.length > 0) {
        const lastBlock = newBlocks[newBlocks.length - 1];
        if (lastBlock.type === 'text' &&
            (lastBlock.content === '' || lastBlock.content.trim() === '')) {
          console.log('删除末尾的空文本框，为文件插入做准备');
          newBlocks.pop();
        }
      }

      // 创建文件块
      const fileBlock: ContentBlock = {
        id: fileId,
        type: 'file',
        content: downloadPath, // 使用下载路径作为content
        fileName,
        fileSize,
        mimeType,
        extension
      };

      // 添加文件块
      newBlocks.push(fileBlock);
      console.log(`普通模式文件块已插入，ID: ${fileId}, 文件名: ${fileName}`);

      return newBlocks;
    });

    // 自动滚动到新插入的文件
    autoScrollToNewContent(fileId, 200);

    // 文件插入后立即触发保存
    if (saveOnFileInsert) {
      // 使用setTimeout确保状态更新完成后再保存
      setTimeout(async () => {
        await saveOnFileInsert(fileId);
      }, 100);
    }
  }, [setBlocks, saveOnFileInsert]);

  /**
   * 处理文件上传
   * @param file 文件对象
   * @returns 上传结果信息或null
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

  /**
   * 统一的文件插入函数
   * @param fileName 文件名
   * @param fileSize 文件大小
   * @param mimeType MIME类型
   * @param extension 文件扩展名
   * @param downloadPath 下载路径
   */
  const insertFile = useCallback(async (
    fileName: string,
    fileSize: number,
    mimeType: string,
    extension: string,
    downloadPath: string
  ) => {
    // 目前只支持普通模式，Markdown模式暂不支持文件块
    if (!isMarkdownMode) {
      await insertFileAtEnd(fileName, fileSize, mimeType, extension, downloadPath);
    }
  }, [isMarkdownMode, insertFileAtEnd]);

  /**
   * 处理文件拖拽上传
   * @param files 文件列表
   */
  const handleFileDrop = useCallback(async (files: FileList) => {
    // 只在普通模式下处理文件拖拽
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
      console.log(`开始下载文件: ${fileName}`);

      // 构建下载URL - 直接使用相对路径避免代理问题
      const downloadUrl = `/api/files/download?fileName=${encodeURIComponent(fileName)}&download=true`;

      // 创建下载链接并触发下载
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.style.display = 'none';

      // 添加到DOM，触发下载，然后移除
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`文件下载已触发: ${fileName}`);

      // 可选：显示下载成功提示
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
