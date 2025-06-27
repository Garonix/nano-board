/**
 * Markdown 模式编辑器组件
 * 负责渲染 Markdown 模式下的编辑区域和预览区域，支持滚动同步
 * 包含内置的 Markdown 组件配置，提供代码高亮、图片优化、表格样式等功能
 */

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { MarkdownModeEditorProps } from '@/types';

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
  // 内置的 Markdown 组件配置 - 支持完整的 Markdown 语法
  const markdownComponents = {
    // 代码块和内联代码 - 修复宽度溢出问题
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code(props: any) {
      const { inline, className, children, ...rest } = props;
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          className="rounded-lg shadow-sm border border-gray-200 my-4 max-w-full"
          wrapLongLines={true}
          customStyle={{
            maxWidth: '100%',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
          {...rest}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={cn('bg-gray-100 px-2 py-1 rounded text-sm font-mono text-red-600 break-words', className)} {...rest}>
          {children}
        </code>
      );
    },

    // 图片组件 - 优化显示，不显示alt文本
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    img(props: any) {
      const { src, alt, ...rest } = props;
      return (
        <span className="inline-block my-6 text-center w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full h-auto rounded-lg shadow-sm block mx-auto"
            style={{
              maxHeight: '300px',
              objectFit: 'contain'
            }}
            {...rest}
          />
        </span>
      );
    },

    // 标题组件 - 确保正确渲染
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1(props: any) {
      return <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-8 pb-2 border-b border-gray-200" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2(props: any) {
      return <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-6 pb-1 border-b border-gray-100" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h3(props: any) {
      return <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-5" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h4(props: any) {
      return <h4 className="text-lg font-medium text-gray-700 mb-2 mt-4" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h5(props: any) {
      return <h5 className="text-base font-medium text-gray-700 mb-2 mt-3" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h6(props: any) {
      return <h6 className="text-sm font-medium text-gray-600 mb-2 mt-3" {...props} />;
    },

    // 段落组件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p(props: any) {
      const { children, ...rest } = props;

      // 检查子元素中是否包含图片
      const hasImage = React.Children.toArray(children).some((child) => {
        if (React.isValidElement(child)) {
          return child.type === 'img' || (child.props && typeof child.props === 'object' && child.props !== null && 'src' in child.props);
        }
        return false;
      });

      // 如果包含图片，使用div而不是p标签
      if (hasImage) {
        return <div className="mb-4" {...rest}>{children}</div>;
      }

      return <p className="mb-4 leading-relaxed text-gray-700" {...rest}>{children}</p>;
    },

    // 列表组件 - 确保正确渲染
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ul(props: any) {
      return <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ol(props: any) {
      return <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li(props: any) {
      return <li className="mb-1" {...props} />;
    },

    // 引用块
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockquote(props: any) {
      return (
        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 bg-blue-50 text-gray-700 italic" {...props} />
      );
    },

    // 表格组件 - 修复宽度溢出问题
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table(props: any) {
      return (
        <div className="overflow-x-auto mb-4 max-w-full">
          <table className="w-full border border-gray-200 rounded-lg" style={{ tableLayout: 'fixed', wordWrap: 'break-word' }} {...props} />
        </div>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thead(props: any) {
      return <thead className="bg-gray-50" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    th(props: any) {
      return <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-200" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    td(props: any) {
      return <td className="px-4 py-2 text-gray-700 border-b border-gray-100" {...props} />;
    },

    // 水平分割线
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hr(props: any) {
      return <hr className="my-8 border-gray-300" {...props} />;
    },

    // 强调和加粗
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strong(props: any) {
      return <strong className="font-bold text-gray-900" {...props} />;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    em(props: any) {
      return <em className="italic text-gray-700" {...props} />;
    },

    // 链接
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a(props: any) {
      return (
        <a
          className="text-blue-600 hover:text-blue-800 underline"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        />
      );
    },

    // 删除线
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    del(props: any) {
      return <del className="line-through text-gray-500" {...props} />;
    },
  };
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
