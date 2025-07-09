/**
 * 工具函数库
 */

import { type ClassValue, clsx } from 'clsx';

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function debounce(
  func: (...args: unknown[]) => void,
  wait: number
): (...args: unknown[]) => void {
  let timeout: NodeJS.Timeout;

  return (...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function isGeneralFile(file: File): boolean {
  return !isImageFile(file) && file.size > 0;
}

export function generateFileId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 格式化时间戳为可读字符串
 * @param date 日期对象
 * @returns 格式化的时间字符串
 */
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function generateContentTitle(content: string, maxLength: number = 30): string {
  if (!content.trim()) return '空白内容';

  const cleanContent = content
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[图片]')
    .replace(/\[图片: [^\]]+\]\([^)]+\)/g, '[图片]')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanContent.length <= maxLength) return cleanContent;
  return cleanContent.substring(0, maxLength) + '...';
}

// 注意：图片缓存功能已移除，统一使用文件系统作为数据源

/**
 * 删除服务器上的图片文件
 * @param imageSrc 图片URL路径
 * @returns Promise<boolean> 删除是否成功
 */
export async function deleteImageFromServer(imageSrc: string): Promise<boolean> {
  try {
    // 从URL中提取文件名
    const fileName = imageSrc.split('/').pop();
    if (!fileName) {
      return false;
    }

    const response = await fetch(`/api/delete-image?path=${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      return true;
    } else if (response.status === 404) {
      // 文件不存在被视为成功（已经不存在了）
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('删除服务器图片时发生错误:', error);
    return false;
  }
}

// 注意：批量删除功能已移除，使用新的本地文件管理API
