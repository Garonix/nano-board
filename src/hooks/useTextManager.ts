/**
 * 文本管理 Hook（简化版）
 * 统一使用本地文件系统，移除API保存功能
 */

import { useCallback } from 'react';

/**
 * 文本管理 Hook（简化版）
 * 注意：API保存功能已移除，统一使用文件系统扫描
 * @returns 文本管理相关函数
 */
export const useTextManager = () => {

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
  }, []);

  return {
    saveTextToFile
  };
};
