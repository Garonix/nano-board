/**
 * 文本管理 Hook
 * 处理文本保存、加载、删除等功能
 */

import { useCallback } from 'react';
import { TextHistoryItem } from '@/types';

/**
 * 文本管理 Hook
 * @param setTextHistory 设置文本历史函数
 * @returns 文本管理相关函数
 */
export const useTextManager = (
  setTextHistory: (history: TextHistoryItem[]) => void
) => {

  /**
   * 加载文本历史列表
   */
  const loadTextHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/save-text');
      if (response.ok) {
        const result = await response.json();
        setTextHistory(result.texts || []);
      } else {
        console.error('加载文本历史失败');
        setTextHistory([]);
      }
    } catch (error) {
      console.error('加载文本历史请求失败:', error);
      setTextHistory([]);
    }
  }, [setTextHistory]);

  /**
   * 保存文本内容到独立文件
   * @param content 文本内容
   * @returns Promise<boolean> 保存是否成功
   */
  const saveTextToFile = useCallback(async (content: string): Promise<boolean> => {
    if (!content.trim()) {
      console.warn('不能保存空白内容');
      return false;
    }

    try {
      const response = await fetch('/api/save-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('文本保存成功:', result.fileName);

        // 保存成功后刷新文本历史列表
        loadTextHistory();
        return true;
      } else {
        const error = await response.json();
        console.error('文本保存失败:', error.error);
        return false;
      }
    } catch (error) {
      console.error('文本保存请求失败:', error);
      return false;
    }
  }, [loadTextHistory]);

  /**
   * 获取指定文本文件的完整内容
   * @param fileName 文件名
   * @returns Promise<string | null> 文本内容
   */
  const getTextContent = useCallback(async (fileName: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/get-text?fileName=${encodeURIComponent(fileName)}`);
      if (response.ok) {
        const result = await response.json();
        return result.content;
      } else {
        console.error('获取文本内容失败');
        return null;
      }
    } catch (error) {
      console.error('获取文本内容请求失败:', error);
      return null;
    }
  }, []);

  /**
   * 删除指定的文本文件
   * @param fileName 文件名
   * @returns Promise<boolean> 删除是否成功
   */
  const deleteTextFile = useCallback(async (fileName: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/save-text?fileName=${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('文本文件删除成功:', fileName);

        // 删除成功后刷新文本历史列表
        loadTextHistory();
        return true;
      } else {
        const error = await response.json();
        console.error('文本文件删除失败:', error.error);
        return false;
      }
    } catch (error) {
      console.error('文本文件删除请求失败:', error);
      return false;
    }
  }, [loadTextHistory]);

  /**
   * 清除所有文本文件
   * @param textHistory 当前文本历史列表
   * @returns Promise<boolean> 清除是否成功
   */
  const clearAllTextFiles = useCallback(async (textHistory: TextHistoryItem[]): Promise<boolean> => {
    if (textHistory.length === 0) {
      console.log('没有文本文件需要清除');
      return true;
    }

    if (!window.confirm('确定要删除所有保存的文本文件吗？此操作无法撤销。')) {
      return false;
    }

    try {
      let successCount = 0;
      const totalCount = textHistory.length;

      // 逐个删除文本文件
      for (const textItem of textHistory) {
        const success = await deleteTextFile(textItem.fileName);
        if (success) {
          successCount++;
        }
      }

      if (successCount === totalCount) {
        console.log('所有文本文件清除完成');
        return true;
      } else {
        console.warn(`部分文本文件清除失败: ${successCount}/${totalCount} 成功`);
        return false;
      }
    } catch (error) {
      console.error('清除文本文件时发生错误:', error);
      return false;
    }
  }, [deleteTextFile]);

  return {
    saveTextToFile,
    loadTextHistory,
    getTextContent,
    deleteTextFile,
    clearAllTextFiles
  };
};
