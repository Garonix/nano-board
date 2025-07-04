/**
 * 文件类型图标系统
 * @description 基于文件扩展名的图标映射系统，为不同类型文件提供视觉标识
 */

import path from 'path';
import { FileTypeIcon } from '@/types';

/**
 * 文件类型图标映射表
 * 根据文件扩展名提供对应的图标、颜色和背景色
 */
export const FILE_TYPE_ICONS: Record<string, FileTypeIcon> = {
  // 文档类
  '.pdf': { icon: '📄', color: 'text-red-600', bgColor: 'bg-red-100' },
  '.doc': { icon: '📝', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  '.docx': { icon: '📝', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  '.txt': { icon: '📄', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  '.rtf': { icon: '📄', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  
  // 表格类
  '.xls': { icon: '📊', color: 'text-green-600', bgColor: 'bg-green-100' },
  '.xlsx': { icon: '📊', color: 'text-green-600', bgColor: 'bg-green-100' },
  '.csv': { icon: '📊', color: 'text-green-600', bgColor: 'bg-green-100' },
  
  // 演示文稿类
  '.ppt': { icon: '📽️', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  '.pptx': { icon: '📽️', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  
  // 压缩类
  '.zip': { icon: '🗜️', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  '.rar': { icon: '🗜️', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  '.7z': { icon: '🗜️', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  '.tar': { icon: '🗜️', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  '.gz': { icon: '🗜️', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  
  // 代码类
  '.js': { icon: '📜', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  '.ts': { icon: '📜', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  '.jsx': { icon: '⚛️', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  '.tsx': { icon: '⚛️', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  '.py': { icon: '🐍', color: 'text-green-600', bgColor: 'bg-green-100' },
  '.java': { icon: '☕', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  '.cpp': { icon: '⚙️', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  '.c': { icon: '⚙️', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  '.html': { icon: '🌐', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  '.css': { icon: '🎨', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  '.json': { icon: '📋', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  '.xml': { icon: '📋', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  '.yaml': { icon: '📋', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  '.yml': { icon: '📋', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  
  // 音频类
  '.mp3': { icon: '🎵', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  '.wav': { icon: '🎵', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  '.flac': { icon: '🎵', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  '.aac': { icon: '🎵', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  
  // 视频类
  '.mp4': { icon: '🎬', color: 'text-red-600', bgColor: 'bg-red-100' },
  '.avi': { icon: '🎬', color: 'text-red-600', bgColor: 'bg-red-100' },
  '.mov': { icon: '🎬', color: 'text-red-600', bgColor: 'bg-red-100' },
  '.mkv': { icon: '🎬', color: 'text-red-600', bgColor: 'bg-red-100' },
  
  // 字体类
  '.ttf': { icon: '🔤', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  '.otf': { icon: '🔤', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  '.woff': { icon: '🔤', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  '.woff2': { icon: '🔤', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  
  // 默认图标
  'default': { icon: '📎', color: 'text-gray-600', bgColor: 'bg-gray-100' }
};

/**
 * 根据文件名获取文件类型图标
 * @param fileName 文件名
 * @returns 文件类型图标信息
 */
export function getFileTypeIcon(fileName: string): FileTypeIcon {
  const extension = path.extname(fileName).toLowerCase();
  return FILE_TYPE_ICONS[extension] || FILE_TYPE_ICONS.default;
}

/**
 * 检查是否为支持的文件类型（非图片类型）
 * @param fileName 文件名
 * @returns 是否为支持的通用文件类型
 */
export function isSupportedFileType(fileName: string): boolean {
  const extension = path.extname(fileName).toLowerCase();
  // 排除图片类型（已有专门处理）
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  return !imageExtensions.includes(extension);
}

/**
 * 获取文件扩展名（不含点号）
 * @param fileName 文件名
 * @returns 文件扩展名
 */
export function getFileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase().slice(1);
}

/**
 * 根据MIME类型获取文件扩展名
 * @param mimeType MIME类型
 * @returns 文件扩展名
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/csv': '.csv',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/zip': '.zip',
    'application/x-rar-compressed': '.rar',
    'application/x-7z-compressed': '.7z',
    'text/javascript': '.js',
    'application/json': '.json',
    'text/html': '.html',
    'text/css': '.css',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'video/mp4': '.mp4',
    'video/x-msvideo': '.avi'
  };
  
  return mimeToExt[mimeType] || '';
}
