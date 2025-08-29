/**
 * 数据目录大小管理工具
 * 提供计算和验证data目录总大小的功能
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getAppEnvironment } from './env';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * 递归计算目录大小
 * @param dirPath 目录路径
 * @returns Promise<number> 目录总大小（字节）
 */
async function calculateDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;

  try {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        // 递归计算子目录大小
        totalSize += await calculateDirectorySize(itemPath);
      } else {
        // 累加文件大小
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // 目录不存在或无法访问时返回0
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`计算目录大小失败: ${dirPath}`, error);
    }
  }

  return totalSize;
}

/**
 * 获取data目录的当前总大小
 * @returns Promise<number> 总大小（字节）
 */
export async function getDataDirectorySize(): Promise<number> {
  return await calculateDirectorySize(DATA_DIR);
}

/**
 * 检查data目录大小是否超过限制
 * @returns Promise<{ isOverLimit: boolean; currentSize: number; maxSize: number; }>
 */
export async function checkDataDirectorySizeLimit(): Promise<{
  isOverLimit: boolean;
  currentSize: number;
  maxSize: number;
}> {
  const env = getAppEnvironment();
  const currentSize = await getDataDirectorySize();
  const maxSize = env.maxDataDirSize;

  return {
    isOverLimit: currentSize > maxSize,
    currentSize,
    maxSize,
  };
}

/**
 * 验证新文件上传是否会超过data目录大小限制
 * @param newFileSize 新文件大小（字节）
 * @returns Promise<void> 如果会超过限制则抛出错误
 */
export async function validateDataDirectorySize(newFileSize: number): Promise<void> {
  const env = getAppEnvironment();
  const currentSize = await getDataDirectorySize();
  const maxSize = env.maxDataDirSize;
  const projectedSize = currentSize + newFileSize;

  if (projectedSize > maxSize) {
    const currentSizeMB = Math.round(currentSize / 1024 / 1024);
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    const newFileSizeMB = Math.round(newFileSize / 1024 / 1024);
    
    throw new Error(
      `数据目录大小将超过限制。当前: ${currentSizeMB}MB, 新文件: ${newFileSizeMB}MB, 限制: ${maxSizeMB}MB`
    );
  }
}

/**
 * 格式化字节大小为可读格式
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * 获取data目录大小统计信息
 * @returns Promise<DataSizeInfo> 详细的大小统计信息
 */
export interface DataSizeInfo {
  totalSize: number;
  maxSize: number;
  usagePercentage: number;
  formattedTotalSize: string;
  formattedMaxSize: string;
  isOverLimit: boolean;
  remainingSpace: number;
  formattedRemainingSpace: string;
}

export async function getDataSizeInfo(): Promise<DataSizeInfo> {
  const env = getAppEnvironment();
  const totalSize = await getDataDirectorySize();
  const maxSize = env.maxDataDirSize;
  const usagePercentage = Math.round((totalSize / maxSize) * 100);
  const isOverLimit = totalSize > maxSize;
  const remainingSpace = Math.max(0, maxSize - totalSize);

  return {
    totalSize,
    maxSize,
    usagePercentage,
    formattedTotalSize: formatBytes(totalSize),
    formattedMaxSize: formatBytes(maxSize),
    isOverLimit,
    remainingSpace,
    formattedRemainingSpace: formatBytes(remainingSpace),
  };
}
