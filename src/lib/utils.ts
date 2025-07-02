/**
 * 工具函数库
 * @description 提供基础的工具函数集合
 */

import { type ClassValue, clsx } from 'clsx';

export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * 合并CSS类名
 * @param inputs - 类名输入
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * 防抖函数
 * @param func - 要防抖的函数
 * @param wait - 等待时间(ms)
 * @returns 防抖后的函数
 */
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

/**
 * 检查是否为图片文件
 * @param file - 文件对象
 * @returns 是否为图片
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * 将文件转换为Base64字符串
 * @param file - 文件对象
 * @returns Base64字符串
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

/**
 * 生成内容预览标题
 * @param content 内容字符串
 * @param maxLength 最大长度
 * @returns 预览标题
 */
export function generateContentTitle(content: string, maxLength: number = 30): string {
  if (!content.trim()) return '空白内容';

  // 移除图片标记和多余空白
  const cleanContent = content
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[图片]') // Markdown图片
    .replace(/\[图片: [^\]]+\]\([^)]+\)/g, '[图片]') // 普通图片
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
      console.error('无法从URL中提取文件名:', imageSrc);
      return false;
    }

    const response = await fetch(`/api/delete-image?path=${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      const result = await response.json();
      console.log('服务器图片删除成功:', result.message);
      return true;
    } else if (response.status === 404) {
      // 文件不存在被视为成功（已经不存在了）
      console.log('图片文件不存在，视为删除成功:', fileName);
      return true;
    } else {
      const error = await response.json();
      console.error('服务器图片删除失败:', error.error);
      return false;
    }
  } catch (error) {
    console.error('删除服务器图片时发生错误:', error);
    return false;
  }
}

// 注意：批量删除功能已移除，使用新的本地文件管理API
