/**
 * 普通模式编辑器组件
 * 负责渲染普通模式下的文本块和图片块，包含悬停按钮、拖拽功能等
 */

'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { NormalModeEditorProps } from '@/types';
import { adjustTextareaHeight } from '@/lib/textareaUtils';

export const NormalModeEditor: React.FC<NormalModeEditorProps> = ({
  blocks,
  focusedBlockId,
  isSingleTextBlock,
  isSavingText,
  onUpdateBlockContent,
  onDeleteBlock,
  onAddTextBlockAfter,
  onClearTextBlockContent,
  onSetFocusedBlockId,
  onHandleImagePaste,
  onHandleKeyDown,
  onHandleSaveText
}) => {
  // 内部管理悬停状态
  const [hoveredTextBlockId, setHoveredTextBlockId] = useState<string | null>(null);
  return (
    <div className="w-full h-full overflow-auto p-2">
      {/* 添加响应式左右边距，缩减文本框宽度以提升阅读体验，保持居中显示 */}
      {/* 大屏幕：左右各300px边距，中等屏幕：150px，小屏幕：20px */}
      <div className="max-w-none space-y-3 mx-auto px-5 md:px-[150px] xl:px-[300px] min-w-0">
        {blocks.map((block, index) => {
          return (
            <div key={block.id} className="relative group">
              {block.type === 'text' ? (
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredTextBlockId(block.id)}
                  onMouseLeave={() => setHoveredTextBlockId(null)}
                >
                  {/* 文本框操作按钮组 - 悬停时显示 */}
                  {hoveredTextBlockId === block.id && (
                    <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      {/* 空文本框只显示删除按钮 */}
                      {!block.content.trim() ? (
                        <button
                          onClick={() => onDeleteBlock(block.id)}
                          className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center"
                          title="删除此文本框"
                        >
                          {/* 使用简单的红叉图标 */}
                          ✕
                        </button>
                      ) : (
                        // 非空文本框显示完整按钮组
                        <>
                          <button
                            onClick={() => onHandleSaveText(block.content)}
                            disabled={isSavingText}
                            className="w-5 h-5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center font-bold"
                            title="保存"
                          >
                            {/* 使用简单的下箭头图标表示保存 */}
                            {isSavingText ? '...' : '↓'}
                          </button>
                          <button
                            onClick={() => onClearTextBlockContent(block.id)}
                            className="w-5 h-5 bg-orange-500 hover:bg-orange-600 text-white text-s rounded-md shadow-lg transition-all duration-200 flex items-center justify-center"
                            title="清空"
                          >
                            {/* 使用简单的循环符号表示清空重置 */}
                            ↻
                          </button>
                          <button
                            onClick={() => onDeleteBlock(block.id)}
                            className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md shadow-lg transition-all duration-200 flex items-center justify-center"
                            title="删除"
                          >
                            {/* 使用简单的红叉图标 */}
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <textarea
                    ref={(el) => {
                      if (el && focusedBlockId === block.id) {
                        // 当获得焦点时自动调整高度
                        setTimeout(() => {
                          adjustTextareaHeight(el, block.content, isSingleTextBlock);
                        }, 0);
                      }
                    }}
                    data-block-id={block.id}
                    value={block.content}
                    onChange={(e) => {
                      const newContent = e.target.value;
                      onUpdateBlockContent(block.id, newContent);

                      // 智能调整高度
                      const target = e.target as HTMLTextAreaElement;
                      adjustTextareaHeight(target, newContent, isSingleTextBlock);
                    }}
                    onPaste={onHandleImagePaste}
                    onKeyDown={(e) => onHandleKeyDown(e, block.id)}
                    onFocus={(e) => {
                      onSetFocusedBlockId(block.id);
                      // 聚焦时调整高度
                      const target = e.target as HTMLTextAreaElement;
                      setTimeout(() => {
                        adjustTextareaHeight(target, block.content, isSingleTextBlock);
                      }, 0);
                    }}
                    onBlur={() => {
                      // 图片已通过上传自动保存到文件系统，无需额外缓存操作
                    }}
                    className={cn(
                      "w-full p-3 border rounded-lg outline-none resize-none font-mono text-sm leading-relaxed bg-white textarea-no-scrollbar",
                      focusedBlockId === block.id
                        ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-20 shadow-sm"
                        : "border-gray-200 hover:border-gray-300",
                      isSingleTextBlock
                        ? "min-h-[25rem] max-h-[25rem]"
                        : "min-h-[2.5rem] max-h-[10rem]"
                    )}
                    placeholder={
                      index === 0 && !block.content
                        ? "开始输入内容，支持粘贴或拖拽图片..."
                        : block.content
                          ? ""
                          : "继续输入..."
                    }
                    spellCheck={false}
                    style={{
                      height: isSingleTextBlock
                        ? '25rem'
                        : 'auto',
                      minHeight: isSingleTextBlock
                        ? '25rem'
                        : '2.5rem',
                      maxHeight: isSingleTextBlock
                        ? '25rem'
                        : '10rem',
                      overflowY: 'auto' // 启用垂直滚动，支持滚轮操作
                    }}
                  />
                </div>
              ) : (
                <div className="w-full text-center my-4">
                  {/* 图片容器 - 限制最大高度300px，修复删除按钮定位 */}
                  <div className="relative inline-block bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 max-w-full group">
                    {/* 图片删除按钮 - 精确定位在图片元素右上角 */}
                    <button
                      onClick={() => onDeleteBlock(block.id)}
                      className="absolute top-2 right-2 z-10 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                      title="删除图片"
                    >
                      <span className="text-xs font-bold">×</span>
                    </button>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={block.content}
                      alt={block.alt || '图片'}
                      className="max-w-full h-auto block"
                      style={{
                        maxHeight: '300px',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const container = target.parentElement!;
                        container.innerHTML = `
                        <div class="p-8 text-center text-red-500 bg-red-50 min-w-[200px]">
                          <div class="text-2xl mb-3">⚠</div>
                          <div class="text-sm font-medium text-red-600">图片加载失败</div>
                          <div class="text-xs mt-2 text-red-400">请检查图片链接</div>
                        </div>
                      `;
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 新建文本框按钮 - 悬停时显示，紧贴元素边缘 */}
              {(block.type === 'image' || (block.type === 'text' && block.content.trim())) && (
                <div className="relative">
                  <button
                    onClick={() => onAddTextBlockAfter(block.id)}
                    className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 opacity-0 group-hover:opacity-100"
                    style={{
                      top: block.type === 'text' ? '-6px' : '-23px' // 紧贴文本框下边框或图片容器下边缘
                    }}
                  >
                    <span className="text-sm font-bold leading-none">+</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
