/**
 * 内容转换Hook
 */

import { useCallback } from 'react';
import { ContentBlock, ImageData } from '@/types';

const TEXT_BLOCK_SEPARATOR = '{}';

export const useContentConverter = (isMarkdownMode: boolean) => {

  const blocksToContent = useCallback((blocks: ContentBlock[]): string => {
    if (isMarkdownMode) {
      return blocks.map(block => {
        if (block.type === 'text') {
          return block.content;
        } else if (block.type === 'image') {
          return `![${block.alt || '图片'}](${block.content})`;
        } else if (block.type === 'file') {
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

  const contentToBlocks = useCallback((content: string): ContentBlock[] => {
    if (!content.trim()) {
      return [{ id: '1', type: 'text', content: '' }];
    }

    const blocks: ContentBlock[] = [];
    let blockId = 1;

    if (isMarkdownMode) {
      const lines = content.split('\n');
      let currentText = '';

      for (const line of lines) {
        const markdownImageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);

        if (markdownImageMatch) {
          if (currentText.trim()) {
            blocks.push({
              id: String(blockId++),
              type: 'text',
              content: currentText.trim()
            });
            currentText = '';
          }

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
      } catch {
      }

      let parts: string[];

      if (content.includes(`\n${TEXT_BLOCK_SEPARATOR}\n`)) {
        parts = content.split(`\n${TEXT_BLOCK_SEPARATOR}\n`);
      }
      else if (content.includes('\n---TEXT_BLOCK_SEPARATOR---\n')) {
        parts = content.split('\n---TEXT_BLOCK_SEPARATOR---\n');
      }
      else {
        parts = [content];
      }

      for (const part of parts) {
        const trimmedPart = part.trim();
        if (!trimmedPart) continue;

        const normalImageMatch = trimmedPart.match(/^\[图片: ([^\]]+)\]\(([^)]+)\)$/);
        const normalFileMatch = trimmedPart.match(/^\[文件: ([^\]]+)\]\(([^)]+)\)$/);

        if (normalImageMatch) {
          if (normalImageMatch[2].includes('/api/files/download')) {
            blocks.push({
              id: String(blockId++),
              type: 'file',
              content: normalImageMatch[2],
              fileName: normalImageMatch[1]
            });
          } else {
            blocks.push({
              id: String(blockId++),
              type: 'image',
              content: normalImageMatch[2],
              alt: normalImageMatch[1]
            });
          }
        } else if (normalFileMatch) {
          blocks.push({
            id: String(blockId++),
            type: 'file',
            content: normalFileMatch[2],
            fileName: normalFileMatch[1]
          });
        } else {
          blocks.push({
            id: String(blockId++),
            type: 'text',
            content: trimmedPart
          });
        }
      }

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
