/**
 * 极简工具函数库
 * 提供基础的工具函数
 */

import { type ClassValue, clsx } from 'clsx';

// 图片缓存项类型
interface CacheItem {
  id: string;
  src: string;
  alt: string;
  timestamp: string | Date;
  fileSize?: number;
}

// 删除结果类型
interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * 合并CSS类名
 * @param inputs 类名输入
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间(ms)
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
 * @param file 文件对象
 * @returns 是否为图片
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * 将文件转换为Base64字符串
 * @param file 文件对象
 * @returns Promise<string> Base64字符串
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

/**
 * 本地图片缓存存储键名
 */
const IMAGE_CACHE_STORAGE_KEY = 'nano-board-image-cache';
const MAX_CACHE_ITEMS = 50; // 最大缓存图片数量

/**
 * 保存图片到本地缓存
 * @param images 图片数据数组
 */
export function saveImagesToCache(images: Array<{id: string, src: string, alt: string}>): void {
  try {
    if (images.length === 0) return; // 没有图片不保存

    const existingData = localStorage.getItem(IMAGE_CACHE_STORAGE_KEY);
    const cacheData = existingData ? JSON.parse(existingData) : { items: [], lastUpdated: new Date() };

    // 为每个图片创建缓存项
    const newItems = images.map(image => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      src: image.src,
      alt: image.alt,
      timestamp: new Date()
    }));

    // 添加到缓存开头，避免重复
    const existingSrcs = new Set(cacheData.items.map((item: CacheItem) => item.src));
    const uniqueNewItems = newItems.filter(item => !existingSrcs.has(item.src));

    if (uniqueNewItems.length > 0) {
      cacheData.items.unshift(...uniqueNewItems);

      // 限制缓存数量
      if (cacheData.items.length > MAX_CACHE_ITEMS) {
        cacheData.items = cacheData.items.slice(0, MAX_CACHE_ITEMS);
      }

      cacheData.lastUpdated = new Date();
      localStorage.setItem(IMAGE_CACHE_STORAGE_KEY, JSON.stringify(cacheData));
    }
  } catch (error) {
    console.error('保存图片缓存失败:', error);
  }
}

/**
 * 从本地存储加载图片缓存
 * @returns 图片缓存数组
 */
export function loadImageCache(): Array<{
  id: string;
  src: string;
  alt: string;
  timestamp: Date;
  fileSize?: number;
}> {
  try {
    const data = localStorage.getItem(IMAGE_CACHE_STORAGE_KEY);
    if (!data) return [];

    const cacheData = JSON.parse(data);
    return cacheData.items.map((item: CacheItem) => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }));
  } catch (error) {
    console.error('加载图片缓存失败:', error);
    return [];
  }
}

/**
 * 清除所有本地图片缓存
 */
export function clearImageCache(): void {
  try {
    localStorage.removeItem(IMAGE_CACHE_STORAGE_KEY);
  } catch (error) {
    console.error('清除图片缓存失败:', error);
  }
}

/**
 * 从缓存中删除指定图片
 * @param imageId 图片ID
 */
export function removeImageFromCache(imageId: string): void {
  try {
    const data = localStorage.getItem(IMAGE_CACHE_STORAGE_KEY);
    if (!data) return;

    const cacheData = JSON.parse(data);
    cacheData.items = cacheData.items.filter((item: CacheItem) => item.id !== imageId);
    cacheData.lastUpdated = new Date();

    localStorage.setItem(IMAGE_CACHE_STORAGE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('删除图片缓存失败:', error);
  }
}

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

/**
 * 批量删除服务器上的图片文件
 * @param imageSrcs 图片URL路径数组
 * @returns Promise<{success: boolean, results: any[]}> 删除结果
 */
export async function batchDeleteImagesFromServer(imageSrcs: string[]): Promise<{success: boolean, results: DeleteResult[]}> {
  try {
    // 从URL中提取文件名
    const fileNames = imageSrcs.map(src => src.split('/').pop()).filter(Boolean);

    if (fileNames.length === 0) {
      return { success: false, results: [] };
    }

    const response = await fetch('/api/delete-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imagePaths: fileNames }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('批量删除服务器图片完成:', result.message);

      // 将"文件不存在"的情况也视为成功
      const adjustedResults = result.results.map((item: DeleteResult) => ({
        ...item,
        success: item.success || item.error === '文件不存在'
      }));

      const successCount = adjustedResults.filter((r: DeleteResult) => r.success).length;
      const adjustedSuccess = successCount === adjustedResults.length;

      return {
        success: adjustedSuccess,
        results: adjustedResults
      };
    } else {
      const error = await response.json();
      console.error('批量删除服务器图片失败:', error.error);
      return { success: false, results: [] };
    }
  } catch (error) {
    console.error('批量删除服务器图片时发生错误:', error);
    return { success: false, results: [] };
  }
}
