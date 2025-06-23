/**
 * 白板编辑器组件
 * 极简的文本编辑器，支持Markdown和图片粘贴
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn, isImageFile, fileToBase64 } from '@/lib/utils';

interface BoardEditorProps {
  className?: string;
}

export const BoardEditor: React.FC<BoardEditorProps> = ({ className }) => {
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 加载初始内容
  useEffect(() => {
    loadContent();
  }, []);

  // 内容变化时自动保存（防抖）
  useEffect(() => {
    if (content && !isLoading) {
      // 清除之前的定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // 设置新的定时器
      saveTimeoutRef.current = setTimeout(async () => {
        if (!content.trim()) return;

        setIsSaving(true);
        try {
          const response = await fetch('/api/board', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
          });

          if (!response.ok) {
            throw new Error('保存失败');
          }
        } catch (error) {
          console.error('自动保存失败:', error);
        } finally {
          setIsSaving(false);
        }
      }, 1000);
    }

    // 清理函数
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, isLoading]);

  // 加载内容
  const loadContent = async () => {
    try {
      const response = await fetch('/api/board');
      const data = await response.json();
      setContent(data.content || '# 欢迎使用 Nano Board\n\n点击这里开始编辑...\n\n支持 **Markdown** 语法和图片粘贴！');
    } catch (error) {
      console.error('加载内容失败:', error);
      setContent('# 欢迎使用 Nano Board\n\n点击这里开始编辑...');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理文本变化
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  // 处理粘贴事件
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file && isImageFile(file)) {
          try {
            const base64 = await fileToBase64(file);
            const imageMarkdown = `\n\n![图片](${base64})\n\n`;

            // 在光标位置插入图片
            const textarea = textareaRef.current;
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const newContent = content.slice(0, start) + imageMarkdown + content.slice(end);
              setContent(newContent);

              // 设置光标位置到图片后面
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
              }, 0);
            }
          } catch (error) {
            console.error('处理图片失败:', error);
          }
        }
      }
    }
  };

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + P 切换预览模式
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      setIsPreview(!isPreview);
    }

    // Tab 键插入空格
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + '  ' + content.slice(end);
      setContent(newContent);

      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  // 自定义Markdown组件
  const markdownComponents = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code(props: any) {
      const { inline, className, children, ...rest } = props;
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          {...rest}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={cn('bg-gray-100 px-1 py-0.5 rounded text-sm', className)} {...rest}>
          {children}
        </code>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    img(props: any) {
      const { src, alt, ...rest } = props;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="max-w-full h-auto rounded-lg shadow-sm my-4"
          {...rest}
        />
      );
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className={cn('h-screen flex flex-col bg-white', className)}>
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>Nano Board</span>
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={cn(
              'px-3 py-1 rounded text-xs transition-colors',
              isPreview
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            )}
          >
            {isPreview ? '编辑模式' : '预览模式'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isSaving && <span className="text-blue-600">保存中...</span>}
          <span className="text-xs">Ctrl+P 切换预览</span>
        </div>
      </div>

      {/* 主编辑区域 */}
      <div className="flex-1 overflow-hidden">
        {isPreview ? (
          // 预览模式
          <div className="h-full overflow-auto p-6">
            <div className="max-w-4xl mx-auto">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
                className="prose prose-lg max-w-none"
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          // 编辑模式
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            className="w-full h-full p-6 border-none outline-none resize-none font-mono text-sm leading-relaxed"
            placeholder="开始输入内容...

支持功能：
- Markdown 语法
- 代码块语法高亮
- 图片粘贴 (Ctrl+V)
- Ctrl+P 切换预览模式"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
};
