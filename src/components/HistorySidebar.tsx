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
    <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm hover:bg-blue-50 transition-all group">
      {/* 文件头部 */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
          {file.fileName.replace(/\.(jpg|jpeg|png|gif|webp|txt)$/i, '')}
        </h4>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs text-gray-500 flex-shrink-0">
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
            className="w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
            title="删除此文件"
          >
            ×
          </button>
        </div>
      </div>

      {/* 文件预览 */}
      {isImage ? (
        <div className="mb-3">
          <img
            src={file.filePath}
            alt={file.fileName}
            className="w-full h-24 object-cover rounded border bg-gray-100"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="mb-3">
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border line-clamp-3">
            {(file as LocalTextFileItem).preview}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <button
        onClick={onInsert}
        className="w-full px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        插入到编辑器
      </button>
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
      {/* 列表头部 */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <span className={cn(
            "w-2 h-2 rounded-full mr-2",
            type === 'image' ? 'bg-blue-500' : 'bg-green-500'
          )}></span>
          本地{typeLabel}文件 ({files.length})
        </h4>

        {!isEmpty && (
          <button
            onClick={onClearAll}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            disabled={isLoading}
            title={`删除所有${typeLabel}文件`}
          >
            清空
          </button>
        )}
      </div>

      {/* 列表内容 */}
      {isEmpty ? (
        <div className="text-center text-gray-400 py-8 text-sm">
          暂无{typeLabel}文件
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onInsert={() => onInsert(file)}
              onDelete={() => onDelete(file.fileName)}
            />
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
  onClearAll
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

  // 处理清空所有文件（保留确认提示）
  const handleClearAll = async () => {
    const fileType = sidebarType === 'images' ? 'image' : 'text';
    const typeLabel = sidebarType === 'images' ? '图片' : '文本';

    // 保留危险操作的确认提示
    if (window.confirm(`确定要删除所有${typeLabel}文件吗？此操作无法撤销。`)) {
      await onClearAll(fileType);
      await onRefresh();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={sidebarRef}
      className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right border-l border-gray-200"
    >
      {/* 头部 */}
      <div className="flex flex-col border-b border-gray-200 bg-gray-50">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4">
          <h3 className="text-lg font-semibold text-gray-900">历史记录</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
            title="关闭"
          >
            ×
          </button>
        </div>

        {/* 切换按钮 */}
        <div className="flex border-t border-gray-200">
          <button
            onClick={() => onSidebarTypeChange('images')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              sidebarType === 'images'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            )}
          >
            图片
          </button>
          <button
            onClick={() => onSidebarTypeChange('texts')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors border-l border-gray-200',
              sidebarType === 'texts'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            )}
          >
            文本
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {loadingState.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="text-sm text-gray-600">加载中...</span>
          </div>
        ) : loadingState.error ? (
          <div className="p-4 text-center">
            <div className="text-red-500 text-sm mb-2">{loadingState.error}</div>
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              重试
            </button>
          </div>
        ) : (
          <div className="p-4">
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
  );
};
