/**
 * Markdown 模式编辑器组件
 * 负责渲染 Markdown 模式下的编辑区域和预览区域，支持滚动同步
 */

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { MarkdownModeEditorProps } from '@/types';
import { markdownComponents } from '@/components/MarkdownComponents';

export const MarkdownModeEditor: React.FC<MarkdownModeEditorProps> = ({
  blocks,
  showMarkdownPreview,
  editorRef,
  previewRef,
  blocksToContent,
  contentToBlocks,
  onSetBlocks,
  onHandleImagePaste,
  onHandleMarkdownKeyDown,
  onSyncScrollFromEditor,
  onSyncScrollFromPreview
}) => {
  return (
    <div className="flex w-full h-full p-2 gap-2">
      {/* 编辑区域 - 使用统一的flex-1确保宽度一致 */}
      <div className={cn(
        'flex flex-col min-w-0', // 使用min-w-0防止内容溢出影响flex宽度计算
        showMarkdownPreview ? 'flex-1' : 'w-full'
      )}>
        {/* 文本编辑区域容器 - 应用与普通模式相同的边框样式 */}
        <div className="h-full border rounded-lg bg-white border-gray-200 hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20 shadow-sm transition-all duration-200">
          <textarea
            ref={editorRef}
            value={blocksToContent(blocks)}
            onChange={(e) => {
              const newBlocks = contentToBlocks(e.target.value);
              onSetBlocks(newBlocks);
            }}
            onPaste={onHandleImagePaste}
            onKeyDown={onHandleMarkdownKeyDown}
            onScroll={showMarkdownPreview ? onSyncScrollFromEditor : undefined}
            onBlur={() => {
              // 图片已通过上传自动保存到文件系统，无需额外缓存操作
            }}
            className="w-full h-full p-3 border-none outline-none resize-none font-mono text-sm leading-relaxed bg-transparent overflow-auto textarea-no-scrollbar rounded-lg"
            placeholder="开始输入Markdown内容，支持粘贴图片..."
            spellCheck={false}
            style={{
              minHeight: 'calc(100vh - 140px)', // 恢复原来的高度设置以确保滚动同步正常工作
              height: 'calc(100vh - 140px)',
              maxHeight: 'calc(100vh - 140px)'
            }}
          />
        </div>
      </div>

      {/* 预览区域 - 使用统一的flex-1确保宽度一致 */}
      {showMarkdownPreview && (
        <div className="flex-1 flex flex-col min-w-0"> {/* 使用min-w-0防止内容溢出影响flex宽度计算 */}
          {/* 预览区域容器 - 应用与编辑区域相同的边框样式 */}
          <div className="h-full border rounded-lg bg-gray-50 border-gray-200 shadow-sm">
            <div
              ref={previewRef}
              className="h-full overflow-auto p-3"
              onScroll={onSyncScrollFromPreview}
              style={{
                minHeight: 'calc(100vh - 140px)', // 与编辑区域保持一致的高度以确保滚动同步
                height: 'calc(100vh - 140px)',
                maxHeight: 'calc(100vh - 140px)'
              }}
            >
              {blocksToContent(blocks).trim() ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                  className="prose prose-sm max-w-none prose-gray markdown-preview-content"
                >
                  {blocksToContent(blocks)}
                </ReactMarkdown>
              ) : (
                <div className="text-gray-400 text-sm">
                  Markdown预览区域
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
