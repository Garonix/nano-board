/**
 * 文件块组件
 */

'use client';

import React from 'react';
import { ContentBlock } from '@/types';
import { getFileTypeIcon } from '@/lib/fileIcons';
import { formatFileSize } from '@/lib/utils';

interface FileBlockProps {
  block: ContentBlock;
  onDelete: (blockId: string) => void;
  onDownload: (fileName: string) => void;
}
export const FileBlock: React.FC<FileBlockProps> = ({
  block,
  onDelete,
  onDownload
}) => {
  const fileIcon = getFileTypeIcon(block.fileName || '');

  const handleDownload = () => {
    if (block.fileName) {
      onDownload(block.fileName);
    }
  };

  const handleDelete = () => {
    onDelete(block.id);
  };



  return (
    <div className="w-full text-center my-4">
      <div className="relative inline-block bg-surface-elevated rounded-xl overflow-hidden shadow-md border border-border hover:shadow-lg transition-all duration-200 max-w-full group">

        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 z-10 w-5 h-5 bg-error-500 hover:bg-error-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl"
          title="删除文件"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={handleDownload}
          className="absolute top-3 right-9 z-10 w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl"
          title="下载文件"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        <div className="p-8 text-center min-w-[200px]">
          <div className={`w-16 h-16 rounded-xl ${fileIcon.bgColor} flex items-center justify-center mx-auto mb-4 transition-transform duration-200 group-hover:scale-105`}>
            <span className="text-4xl">{fileIcon.icon}</span>
          </div>
          <div className="text-sm font-medium text-gray-700 mb-2 line-clamp-2 break-words">
            {block.fileName || '未知文件'}
          </div>

          {block.fileSize && (
            <div className="text-xs text-gray-500">
              {formatFileSize(block.fileSize)}
            </div>
          )}

          {block.extension && (
            <div className={`text-xs ${fileIcon.color} mt-1 font-medium uppercase`}>
              {block.extension.replace('.', '')}
            </div>
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      </div>
    </div>
  );
};
