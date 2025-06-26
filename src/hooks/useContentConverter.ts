/**
 * 内容转换 Hook
 * 处理 blocks 和文本内容之间的转换
 */

import { useCallback } from 'react';
import { ContentBlock, ImageData } from '@/types';

// 普通模式下用于分隔独立文本块的特殊标识符
const TEXT_BLOCK_SEPARATOR = '---TEXT_BLOCK_SEPARATOR---';

/**
 * 内容转换 Hook
 * @param isMarkdownMode 是否为 Markdown 模式
 * @returns 内容转换相关函数
 */
export const useContentConverter = (isMarkdownMode: boolean) => {

  // 将blocks转换为文本内容（用于保存）
  const blocksToContent = useCallback((blocks: ContentBlock[]): string => {
    if (isMarkdownMode) {
      // Markdown 模式：保持原有逻辑，用换行符连接
      return blocks.map(block => {
        if (block.type === 'text') {
          return block.content;
        } else {
          return `![${block.alt || '图片'}](${block.content})`;
        }
      }).join('\n');
    } else {
      // 普通模式：使用特殊分隔符来保持文本块的独立性
      return blocks.map(block => {
        if (block.type === 'text') {
          return block.content;
        } else {
          return `[图片: ${block.alt || '图片'}](${block.content})`;
        }
      }).join(`\n${TEXT_BLOCK_SEPARATOR}\n`);
    }
  }, [isMarkdownMode]);

  // 将文本内容转换为blocks（用于加载）
  const contentToBlocks = useCallback((content: string): ContentBlock[] => {
    if (!content.trim()) {
      return [{ id: '1', type: 'text', content: '' }];
    }

    const blocks: ContentBlock[] = [];
    let blockId = 1;

    if (isMarkdownMode) {
      // Markdown 模式：保持原有逻辑
      const lines = content.split('\n');
      let currentText = '';

      for (const line of lines) {
        // 检测Markdown图片语法
        const markdownImageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);

        if (markdownImageMatch) {
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
          blocks.push({
            id: String(blockId++),
            type: 'image',
            content: markdownImageMatch[2],
            alt: markdownImageMatch[1]
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
    } else {
      // 普通模式：使用分隔符来识别独立的文本块
      const parts = content.split(`\n${TEXT_BLOCK_SEPARATOR}\n`);

      for (const part of parts) {
        const trimmedPart = part.trim();
        if (!trimmedPart) continue;

        // 检测普通图片语法
        const normalImageMatch = trimmedPart.match(/^\[图片: ([^\]]+)\]\(([^)]+)\)$/);

        if (normalImageMatch) {
          // 添加图片块
          blocks.push({
            id: String(blockId++),
            type: 'image',
            content: normalImageMatch[2],
            alt: normalImageMatch[1]
          });
        } else {
          // 添加文本块
          blocks.push({
            id: String(blockId++),
            type: 'text',
            content: trimmedPart
          });
        }
      }

      // 如果没有解析出任何块，创建一个空文本块
      if (blocks.length === 0) {
        blocks.push({
          id: String(blockId++),
          type: 'text',
          content: ''
        });
      }
    }

    return blocks;
  }, [isMarkdownMode]);

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
