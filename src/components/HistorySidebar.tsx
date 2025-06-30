/**
 * 历史侧边栏组件（简化版）
 * 统一管理图片和文本文件的历史记录显示
 */

import React, { useRef, useEffect } from 'react';
import { LocalImageFileItem, LocalTextFileItem, FileHistoryLoadingState, HistorySidebarType } from '@/types';
import { cn } from '@/lib/utils';

interface HistorySidebarProps {
  // 显示状态
  isVisible: boolean;
  onClose: () => void;

  // 侧边栏类型
  sidebarType: HistorySidebarType;
  onSidebarTypeChange: (type: HistorySidebarType) => void;

  // 文件数据
  imageFiles: LocalImageFileItem[];
  textFiles: LocalTextFileItem[];
  loadingState: FileHistoryLoadingState;

  // 操作回调
  onRefresh: () => Promise<void>;
  onImageInsert: (imageSrc: string, altText: string) => void;
  onTextInsert: (fileName: string) => Promise<void>;
  onFileDelete: (fileName: string, type: 'image' | 'text') => Promise<void>;
  onClearAll: (type: 'image' | 'text') => Promise<void>;
  onConfirm?: (message: string) => Promise<boolean>;
}

/**
 * 文件项组件
 */
const FileItem: React.FC<{
  file: LocalImageFileItem | LocalTextFileItem;
  onInsert: () => void;
  onDelete: () => void;
}> = ({ file, onInsert, onDelete }) => {
  const isImage = file.type === 'image';

  return (
    <div
      onClick={onInsert}
      className="border border-border rounded-lg p-4 hover:border-primary-300 hover:shadow-md hover:bg-primary-50 transition-all duration-200 group cursor-pointer">
      {/* 现代化文件头部 */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground line-clamp-2 flex-1">
          {file.fileName.replace(/\.(jpg|jpeg|png|gif|webp|txt)$/i, '')}
        </h4>
        <div className="flex items-center gap-3 ml-3">
          <span className="text-xs text-neutral-500 flex-shrink-0 bg-neutral-100 px-2 py-1 rounded-md">
            {new Date(file.modifiedAt).toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-6 h-6 flex items-center justify-center text-error-500 hover:text-error-700 hover:bg-error-100 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100"
            title="删除此文件"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 现代化文件预览 */}
      {isImage ? (
        <div className="mb-2">
          <div className="relative overflow-hidden rounded-lg bg-neutral-100">
            <img
              src={file.filePath}
              alt={file.fileName}
              className="w-full h-28 object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </div>
        </div>
      ) : (
        <div className="mb-2">
          <div className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-lg border border-neutral-200 line-clamp-3 font-mono leading-relaxed">
            {(file as LocalTextFileItem).preview}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 文件列表组件
 */
const FileList: React.FC<{
  files: LocalImageFileItem[] | LocalTextFileItem[];
  type: 'image' | 'text';
  onInsert: (file: LocalImageFileItem | LocalTextFileItem) => void;
  onDelete: (fileName: string) => void;
  onClearAll: () => void;
  isLoading: boolean;
}> = ({ files, type, onInsert, onDelete, onClearAll, isLoading }) => {
  const isEmpty = files.length === 0;
  const typeLabel = type === 'image' ? '图片' : '文本';

  return (
    <div>
      {/* 现代化列表头部 */}
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-sm font-semibold text-foreground flex items-center">
          <div className={cn(
            "w-3 h-3 rounded-full mr-3 flex items-center justify-center",
            type === 'image' ? 'bg-primary-500' : 'bg-success-500'
          )}>
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
          缓存{typeLabel}
          <span className="ml-2 px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full">
            {files.length}
          </span>
        </h4>

        {!isEmpty && (
          <button
            onClick={onClearAll}
            className="px-3 py-1.5 text-xs rounded-lg transition-all duration-200 bg-error-500 text-white hover:bg-error-600"
            disabled={isLoading}
            title={`删除所有${typeLabel}文件`}
          >
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </span>
          </button>
        )}
      </div>

      {/* 现代化列表内容 */}
      {isEmpty ? (
        <div className="text-center py-12 animate-fade-in">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
            type === 'image' ? 'bg-primary-100' : 'bg-success-100'
          )}>
            {type === 'image' ? (
              <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <div className="text-neutral-500 text-sm font-medium mb-1">暂无{typeLabel}文件</div>
          <div className="text-neutral-400 text-xs">
            {type === 'image' ? '上传图片后会在这里显示' : '保存文本后会在这里显示'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {files.map((file, index) => (
            <div key={file.id} className="animate-scale-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
              <FileItem
                file={file}
                onInsert={() => onInsert(file)}
                onDelete={() => onDelete(file.fileName)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 历史侧边栏主组件
 */
export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isVisible,
  onClose,
  sidebarType,
  onSidebarTypeChange,
  imageFiles,
  textFiles,
  loadingState,
  onRefresh,
  onImageInsert,
  onTextInsert,
  onFileDelete,
  onClearAll,
  onConfirm
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭侧边栏
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isVisible && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  // 处理文件插入
  const handleFileInsert = async (file: LocalImageFileItem | LocalTextFileItem) => {
    if (file.type === 'image') {
      const imageFile = file as LocalImageFileItem;
      onImageInsert(imageFile.filePath, imageFile.fileName.replace(/\.[^/.]+$/, ''));
    } else {
      await onTextInsert(file.fileName);
    }
    onClose();
  };

  // 处理文件删除（移除确认提示）
  const handleFileDelete = async (fileName: string) => {
    await onFileDelete(fileName, sidebarType === 'images' ? 'image' : 'text');
    await onRefresh();
  };

  // 处理清空所有文件（使用现代化确认对话框）
  const handleClearAll = async () => {
    const fileType = sidebarType === 'images' ? 'image' : 'text';
    const typeLabel = sidebarType === 'images' ? '图片' : '文本';

    // 使用传入的确认函数或回退到原生确认
    const confirmed = onConfirm
      ? await onConfirm(`确定要删除所有${typeLabel}文件吗？此操作无法撤销。`)
      : window.confirm(`确定要删除所有${typeLabel}文件吗？此操作无法撤销。`);

    if (confirmed) {
      await onClearAll(fileType);
      await onRefresh();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-end p-4 animate-fade-in">
      <div
        ref={sidebarRef}
        className="w-full sm:w-96 md:w-96 lg:w-96 max-h-[calc(100vh-2rem)] bg-surface-elevated shadow-lg rounded-lg flex flex-col animate-slide-in-right border border-border mobile-sidebar tablet-sidebar"
      >
      {/* 现代化头部 */}
      <div className="flex flex-col border-b border-border bg-surface">
        {/* 现代化标题栏 */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground">历史记录</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-neutral-500 hover:text-foreground hover:bg-neutral-100 rounded-lg transition-all duration-200"
            title="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 现代化标签切换 */}
        <div className="flex bg-neutral-100 rounded-lg mx-6 mb-2 p-1">
          <button
            onClick={() => onSidebarTypeChange('images')}
            className={cn(
              'flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2',
              sidebarType === 'images'
                ? 'text-primary-700 bg-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>图片</span>
          </button>
          <button
            onClick={() => onSidebarTypeChange('texts')}
            className={cn(
              'flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2',
              sidebarType === 'texts'
                ? 'text-primary-700 bg-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>文本</span>
          </button>
        </div>
      </div>

      {/* 现代化内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {loadingState.isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
            <div className="relative mb-4">
              <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin-modern"></div>
            </div>
            <div className="text-sm text-neutral-500">加载历史记录中...</div>
          </div>
        ) : loadingState.error ? (
          <div className="p-6 text-center animate-scale-fade-in">
            <div className="w-12 h-12 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="text-error-600 text-sm font-medium mb-3">加载失败</div>
            <div className="text-neutral-500 text-sm mb-4">{loadingState.error}</div>
            <button
              onClick={onRefresh}
              className="px-4 py-2 text-sm rounded-lg transition-all duration-200 bg-primary-600 text-white hover:bg-primary-700"
            >
              重新加载
            </button>
          </div>
        ) : (
          <div className="p-6">
            <FileList
              files={sidebarType === 'images' ? imageFiles : textFiles}
              type={sidebarType === 'images' ? 'image' : 'text'}
              onInsert={handleFileInsert}
              onDelete={handleFileDelete}
              onClearAll={handleClearAll}
              isLoading={loadingState.isLoading}
            />
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
