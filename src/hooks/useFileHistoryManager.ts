/**
 * 文件历史管理 Hook
 * 处理本地文件系统扫描，支持图片和文本文件的历史记录管理
 */

import { useCallback } from 'react';
import { LocalImageFileItem, LocalTextFileItem, FileHistoryLoadingState } from '@/types';

/**
 * 支持的图片文件扩展名
 */
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * 支持的文本文件扩展名
 */
const SUPPORTED_TEXT_EXTENSIONS = ['.txt'];

/**
 * 文件历史管理 Hook
 * @param setLocalImageFiles 设置本地图片文件列表函数
 * @param setLocalTextFiles 设置本地文本文件列表函数
 * @param setFileHistoryLoadingState 设置加载状态函数
 * @returns 文件历史管理相关函数
 */
export const useFileHistoryManager = (
  setLocalImageFiles: (files: LocalImageFileItem[]) => void,
  setLocalTextFiles: (files: LocalTextFileItem[]) => void,
  setFileHistoryLoadingState: (state: FileHistoryLoadingState) => void
) => {

  /**
   * 扫描本地图片文件
   */
  const scanLocalImageFiles = useCallback(async (): Promise<LocalImageFileItem[]> => {
    try {
      const response = await fetch('/api/scan-files?type=images');
      if (!response.ok) {
        throw new Error(`扫描图片文件失败: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '扫描图片文件失败');
      }
      
      return result.files || [];
    } catch (error) {
      console.error('扫描本地图片文件失败:', error);
      throw error;
    }
  }, []);

  /**
   * 扫描本地文本文件
   */
  const scanLocalTextFiles = useCallback(async (): Promise<LocalTextFileItem[]> => {
    try {
      const response = await fetch('/api/scan-files?type=texts');
      if (!response.ok) {
        throw new Error(`扫描文本文件失败: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '扫描文本文件失败');
      }
      
      return result.files || [];
    } catch (error) {
      console.error('扫描本地文本文件失败:', error);
      throw error;
    }
  }, []);

  /**
   * 刷新文件历史记录（懒加载）
   * 只有当用户主动点击历史按钮时才执行扫描
   */
  const refreshFileHistory = useCallback(async () => {
    // 设置加载状态
    setFileHistoryLoadingState({
      isLoading: true,
      error: null,
      lastUpdated: null
    });

    try {
      // 并行扫描图片和文本文件
      const [imageFiles, textFiles] = await Promise.all([
        scanLocalImageFiles(),
        scanLocalTextFiles()
      ]);

      // 更新状态
      setLocalImageFiles(imageFiles);
      setLocalTextFiles(textFiles);
      
      // 设置成功状态
      setFileHistoryLoadingState({
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      });

      console.log(`文件历史刷新完成: ${imageFiles.length} 个图片文件, ${textFiles.length} 个文本文件`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '刷新文件历史失败';
      
      // 设置错误状态
      setFileHistoryLoadingState({
        isLoading: false,
        error: errorMessage,
        lastUpdated: null
      });

      console.error('刷新文件历史失败:', error);
    }
  }, [scanLocalImageFiles, scanLocalTextFiles, setLocalImageFiles, setLocalTextFiles, setFileHistoryLoadingState]);

  /**
   * 获取指定文本文件的完整内容
   * @param fileName 文件名
   * @returns Promise<string | null> 文本内容
   */
  const getLocalTextFileContent = useCallback(async (fileName: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/get-local-file?fileName=${encodeURIComponent(fileName)}&type=text`);
      if (!response.ok) {
        throw new Error(`获取文本文件内容失败: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '获取文本文件内容失败');
      }
      
      return result.content;
    } catch (error) {
      console.error('获取本地文本文件内容失败:', error);
      return null;
    }
  }, []);

  /**
   * 删除本地文件
   * @param fileName 文件名
   * @param fileType 文件类型
   * @returns Promise<boolean> 删除是否成功
   */
  const deleteLocalFile = useCallback(async (fileName: string, fileType: 'image' | 'text'): Promise<boolean> => {
    try {
      const response = await fetch(`/api/delete-local-file?fileName=${encodeURIComponent(fileName)}&type=${fileType}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`删除文件失败: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '删除文件失败');
      }
      
      console.log(`本地文件删除成功: ${fileName}`);
      return true;
    } catch (error) {
      console.error('删除本地文件失败:', error);
      return false;
    }
  }, []);

  /**
   * 清除所有本地文件
   * @param fileType 文件类型
   * @returns Promise<boolean> 清除是否成功
   */
  const clearAllLocalFiles = useCallback(async (fileType: 'image' | 'text'): Promise<boolean> => {
    if (!window.confirm(`确定要删除所有${fileType === 'image' ? '图片' : '文本'}文件吗？此操作无法撤销。`)) {
      return false;
    }

    try {
      const response = await fetch(`/api/clear-local-files?type=${fileType}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`清除文件失败: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '清除文件失败');
      }
      
      console.log(`所有${fileType === 'image' ? '图片' : '文本'}文件清除完成`);
      return true;
    } catch (error) {
      console.error('清除本地文件失败:', error);
      return false;
    }
  }, []);

  return {
    refreshFileHistory,
    getLocalTextFileContent,
    deleteLocalFile,
    clearAllLocalFiles,
    // 工具函数
    SUPPORTED_IMAGE_EXTENSIONS,
    SUPPORTED_TEXT_EXTENSIONS
  };
};
