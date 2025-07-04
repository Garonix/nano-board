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

  return {
    saveTextToFile
  };
};
