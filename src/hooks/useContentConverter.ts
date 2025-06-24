/**
 * 内容转换 Hook
 * 处理 blocks 和文本内容之间的转换
 */

import { useCallback } from 'react';
import { ContentBlock, ImageData } from '@/types';

/**
 * 内容转换 Hook
 * @param isMarkdownMode 是否为 Markdown 模式
 * @returns 内容转换相关函数
 */
export const useContentConverter = (isMarkdownMode: boolean) => {
  
  // 将blocks转换为文本内容（用于保存）
  const blocksToContent = useCallback((blocks: ContentBlock[]): string => {
    return blocks.map(block => {
      if (block.type === 'text') {
        return block.content;
      } else {
        return isMarkdownMode
          ? `![${block.alt || '图片'}](${block.content})`
          : `[图片: ${block.alt || '图片'}](${block.content})`;
      }
    }).join('\n');
  }, [isMarkdownMode]);

  // 将文本内容转换为blocks（用于加载）
  const contentToBlocks = useCallback((content: string): ContentBlock[] => {
    if (!content.trim()) {
      return [{ id: '1', type: 'text', content: '' }];
    }

    const blocks: ContentBlock[] = [];
    let blockId = 1;

    // 简单的图片链接检测
    const lines = content.split('\n');
    let currentText = '';

    for (const line of lines) {
      // 检测Markdown图片语法
      const markdownImageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      // 检测普通图片语法
      const normalImageMatch = line.match(/^\[图片: ([^\]]+)\]\(([^)]+)\)$/);

      if (markdownImageMatch || normalImageMatch) {
        // 如果有累积的文本，先添加文本块
        if (currentText.trim()) {
          blocks.push({
            id: String(blockId++),
            type: 'text',
            content: currentText.trim()
          });
          currentText = '';
        }

        // 添加图片块
        const match = markdownImageMatch || normalImageMatch;
        blocks.push({
          id: String(blockId++),
          type: 'image',
          content: match![2],
          alt: match![1]
        });
      } else {
        currentText += (currentText ? '\n' : '') + line;
      }
    }

    // 添加剩余的文本
    if (currentText.trim() || blocks.length === 0) {
      blocks.push({
        id: String(blockId++),
        type: 'text',
        content: currentText
      });
    }

    return blocks;
  }, []);

  // 提取当前blocks中的图片数据
  const extractImagesFromBlocks = useCallback((blocks: ContentBlock[]): ImageData[] => {
    return blocks
      .filter(block => block.type === 'image')
      .map(block => ({
        id: block.id,
        src: block.content,
        alt: block.alt || '图片'
      }));
  }, []);

  return {
    blocksToContent,
    contentToBlocks,
    extractImagesFromBlocks
  };
};
