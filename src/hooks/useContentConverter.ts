/**
 * 内容转换Hook
 * @description 处理blocks和文本内容之间的双向转换
 */

import { useCallback } from 'react';
import { ContentBlock, ImageData } from '@/types';

/** 普通模式文本块分隔符 */
const TEXT_BLOCK_SEPARATOR = '{}';

/**
 * 内容转换Hook
 * @param isMarkdownMode - 是否为Markdown模式
 * @returns 内容转换函数集合
 */
export const useContentConverter = (isMarkdownMode: boolean) => {

  /**
   * 将blocks转换为存储内容
   * @param blocks - 内容块数组
   * @returns 转换后的存储内容
   */
  const blocksToContent = useCallback((blocks: ContentBlock[]): string => {
    if (isMarkdownMode) {
      // Markdown模式：使用文本格式存储
      return blocks.map(block => {
        if (block.type === 'text') {
          return block.content;
        } else if (block.type === 'image') {
          return `![${block.alt || '图片'}](${block.content})`;
        } else if (block.type === 'file') {
          // Markdown模式暂不支持文件块，转换为文本描述
          return `[文件: ${block.fileName || '未知文件'}]`;
        }
        return '';
      }).join('\n');
    } else {
      // 普通模式：使用JSON格式存储blocks数组
      return JSON.stringify({
        version: '2.0',
        blocks: blocks.map(block => ({
          id: block.id,
          type: block.type,
          content: block.content,
          ...(block.alt && { alt: block.alt }),
          ...(block.fileName && { fileName: block.fileName }),
          ...(block.fileSize && { fileSize: block.fileSize }),
          ...(block.mimeType && { mimeType: block.mimeType }),
          ...(block.extension && { extension: block.extension })
        }))
      }, null, 2);
    }
  }, [isMarkdownMode]);

  /**
   * 将存储内容转换为blocks
   * @param content - 存储内容
   * @returns 转换后的内容块数组
   */
  const contentToBlocks = useCallback((content: string): ContentBlock[] => {
    if (!content.trim()) {
      return [{ id: '1', type: 'text', content: '' }];
    }

    const blocks: ContentBlock[] = [];
    let blockId = 1;

    if (isMarkdownMode) {
      // Markdown 模式：使用文本格式解析
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
      // 普通模式：优先使用JSON格式解析，向后兼容文本格式
      try {
        // 尝试解析JSON格式
        const jsonData = JSON.parse(content);

        if (jsonData.version === '2.0' && Array.isArray(jsonData.blocks)) {
          // 新版JSON格式：直接使用blocks数组
          return jsonData.blocks.map((block: ContentBlock, index: number) => ({
            id: block.id || String(index + 1),
            type: block.type || 'text',
            content: block.content || '',
            ...(block.alt && { alt: block.alt }),
            ...(block.fileName && { fileName: block.fileName }),
            ...(block.fileSize && { fileSize: block.fileSize }),
            ...(block.mimeType && { mimeType: block.mimeType }),
            ...(block.extension && { extension: block.extension })
          }));
        }
      } catch {
        // JSON解析失败，使用文本格式解析（向后兼容）
      }

      // 向后兼容：使用分隔符来识别独立的文本块
      let parts: string[];

      // 优先尝试新的大括号分隔符
      if (content.includes(`\n${TEXT_BLOCK_SEPARATOR}\n`)) {
        parts = content.split(`\n${TEXT_BLOCK_SEPARATOR}\n`);
      }
      // 向后兼容：支持旧的分隔符格式
      else if (content.includes('\n---TEXT_BLOCK_SEPARATOR---\n')) {
        parts = content.split('\n---TEXT_BLOCK_SEPARATOR---\n');
      }
      // 如果没有分隔符，将整个内容作为单个块
      else {
        parts = [content];
      }

      for (const part of parts) {
        const trimmedPart = part.trim();
        if (!trimmedPart) continue;

        // 检测普通图片语法
        const normalImageMatch = trimmedPart.match(/^\[图片: ([^\]]+)\]\(([^)]+)\)$/);
        // 检测文件语法
        const normalFileMatch = trimmedPart.match(/^\[文件: ([^\]]+)\]\(([^)]+)\)$/);

        if (normalImageMatch) {
          // 检查是否是文件下载路径（误标记为图片的情况）
          if (normalImageMatch[2].includes('/api/files/download')) {
            // 这实际上是一个文件，转换为文件块
            blocks.push({
              id: String(blockId++),
              type: 'file',
              content: normalImageMatch[2],
              fileName: normalImageMatch[1]
            });
          } else {
            // 真正的图片块
            blocks.push({
              id: String(blockId++),
              type: 'image',
              content: normalImageMatch[2],
              alt: normalImageMatch[1]
            });
          }
        } else if (normalFileMatch) {
          // 添加文件块（向后兼容旧格式）
          blocks.push({
            id: String(blockId++),
            type: 'file',
            content: normalFileMatch[2],
            fileName: normalFileMatch[1]
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
