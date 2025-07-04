/**
 * 文件历史管理 Hook（简化版）
 * 使用统一的文件API，简化状态管理
 */

import { useCallback } from 'react';
import { LocalImageFileItem, LocalTextFileItem, LocalGeneralFileItem, FileHistoryLoadingState } from '@/types';

/**
 * 文件历史管理 Hook（简化版）
 * @param setLocalImageFiles 设置图片缓存列表函数
 * @param setLocalTextFiles 设置本地文本文件列表函数
 * @param setLocalGeneralFiles 设置通用文件列表函数
 * @param setFileHistoryLoadingState 设置加载状态函数
 * @returns 文件历史管理相关函数
 */
export const useFileHistoryManager = (
  setLocalImageFiles: (files: LocalImageFileItem[]) => void,
  setLocalTextFiles: (files: LocalTextFileItem[]) => void,
  setLocalGeneralFiles: (files: LocalGeneralFileItem[]) => void,
  setFileHistoryLoadingState: (state: FileHistoryLoadingState) => void
) => {

  /**
   * 扫描指定类型的文件（使用新的统一API）
   */
  const scanFiles = useCallback(async (type: 'images' | 'texts' | 'files'): Promise<LocalImageFileItem[] | LocalTextFileItem[] | LocalGeneralFileItem[]> => {
    try {
      const response = await fetch(`/api/files?action=scan&type=${type}`);
      if (!response.ok) {
        throw new Error(`扫描${type}文件失败: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || `扫描${type}文件失败`);
      }

      return result.files || [];
    } catch (error) {
      // 如果新API失败，尝试使用旧API作为后备
      try {
        const fallbackResponse = await fetch(`/api/scan-files?type=${type}`);
        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          if (fallbackResult.success) {
            return fallbackResult.files || [];
          }
        }
      } catch (_fallbackError) {
        // 静默处理后备API错误
      }
      throw error;
    }
  }, []);

  /**
   * 刷新文件历史记录（简化版）
   */
  const refreshFileHistory = useCallback(async () => {
    setFileHistoryLoadingState({
      isLoading: true,
      error: null,
      lastUpdated: null
    });

    try {
      // 并行扫描图片、文本文件和通用文件
      const [imageFiles, textFiles, generalFiles] = await Promise.all([
        scanFiles('images') as Promise<LocalImageFileItem[]>,
        scanFiles('texts') as Promise<LocalTextFileItem[]>,
        scanFiles('files') as Promise<LocalGeneralFileItem[]>
      ]);

      // 更新状态
      setLocalImageFiles(imageFiles);
      setLocalTextFiles(textFiles);
      setLocalGeneralFiles(generalFiles);

      // 设置成功状态
      setFileHistoryLoadingState({
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '刷新文件历史失败';

      setFileHistoryLoadingState({
        isLoading: false,
        error: errorMessage,
        lastUpdated: null
      });
    }
  }, [scanFiles, setLocalImageFiles, setLocalTextFiles, setLocalGeneralFiles, setFileHistoryLoadingState]);

  /**
   * 获取文本文件内容
   */
  const getTextFileContent = useCallback(async (fileName: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/files?action=content&fileName=${encodeURIComponent(fileName)}&type=text`);
      if (!response.ok) {
        throw new Error(`获取文本文件内容失败: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '获取文本文件内容失败');
      }

      return result.content;
    } catch (error) {
      console.error('获取文本文件内容失败:', error);
      return null;
    }
  }, []);

  /**
   * 删除文件
   */
  const deleteFile = useCallback(async (fileName: string, fileType: 'image' | 'text'): Promise<boolean> => {
    try {
      const response = await fetch(`/api/files?fileName=${encodeURIComponent(fileName)}&type=${fileType}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`删除文件失败: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '删除文件失败');
      }

      console.log(`文件删除成功: ${fileName}`);
      return true;
    } catch (error) {
      console.error('删除文件失败:', error);
      return false;
    }
  }, []);

  /**
   * 清除所有文件
   */
  const clearAllFiles = useCallback(async (fileType: 'image' | 'text'): Promise<boolean> => {
    try {
      const response = await fetch(`/api/files?action=clear&type=${fileType}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`清除文件失败: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '清除文件失败');
      }

      return true;
    } catch (_error) {
      return false;
    }
  }, []);

  return {
    refreshFileHistory,
    getTextFileContent,
    deleteFile,
    clearAllFiles
  };
};
