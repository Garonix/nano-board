/**
 * 统一文件管理API路由
 * 合并文件扫描、获取、删除、清除等功能
 * 支持图片和文本文件的统一管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { LocalImageFileItem, LocalTextFileItem, LocalGeneralFileItem } from '@/types';

const PICS_DIR = path.join(process.cwd(), 'data', 'pics');
const TEXTS_DIR = path.join(process.cwd(), 'data', 'texts');
const FILES_DIR = path.join(process.cwd(), 'data', 'files');

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const SUPPORTED_TEXT_EXTENSIONS = ['.txt'];
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 检查文件扩展名是否支持
 */
function isFileSupported(fileName: string, supportedExtensions: string[]): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return supportedExtensions.includes(ext);
}

/**
 * 验证文件路径安全性
 */
function validateFilePath(fileName: string, baseDir: string): string {
  const safeFileName = path.basename(fileName);
  const fullPath = path.join(baseDir, safeFileName);

  if (!fullPath.startsWith(baseDir)) {
    throw new Error('无效的文件路径');
  }

  return fullPath;
}

/**
 * 根据文件扩展名获取MIME类型
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml'
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * 扫描指定类型的文件
 */
async function scanFiles(type: 'images' | 'texts' | 'files'): Promise<LocalImageFileItem[] | LocalTextFileItem[] | LocalGeneralFileItem[]> {
  const isImages = type === 'images';
  const isTexts = type === 'texts';
  const isFiles = type === 'files';

  const targetDir = isImages ? PICS_DIR : isTexts ? TEXTS_DIR : FILES_DIR;
  const supportedExtensions = isImages ? SUPPORTED_IMAGE_EXTENSIONS : isTexts ? SUPPORTED_TEXT_EXTENSIONS : null;

  await ensureDirectoryExists(targetDir);

  try {
    const files = await fs.readdir(targetDir);
    const filteredFiles = isFiles
      ? files // 对于通用文件，不过滤扩展名
      : files.filter(file => isFileSupported(file, supportedExtensions!));

    if (isImages) {
      const imageItems = await Promise.all(
        filteredFiles.map(async (fileName): Promise<LocalImageFileItem | null> => {
          try {
            const filePath = path.join(targetDir, fileName);
            const stats = await fs.stat(filePath);

            return {
              id: fileName,
              fileName,
              filePath: `/api/images/${fileName}`,
              size: stats.size,
              modifiedAt: stats.mtime.toISOString(),
              type: 'image',
              extension: path.extname(fileName).toLowerCase()
            };
          } catch (error) {
            console.error(`读取文件 ${fileName} 失败:`, error);
            return null;
          }
        })
      );

      return imageItems
        .filter((item): item is LocalImageFileItem => item !== null)
        .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    } else if (isTexts) {
      const textItems = await Promise.all(
        filteredFiles.map(async (fileName): Promise<LocalTextFileItem | null> => {
          try {
            const filePath = path.join(targetDir, fileName);
            const stats = await fs.stat(filePath);

            // 读取纯文本文件预览
            const content = await fs.readFile(filePath, 'utf-8');
            const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;

            return {
              id: fileName,
              fileName,
              filePath: `/api/files/content?fileName=${encodeURIComponent(fileName)}&type=text`,
              size: stats.size,
              modifiedAt: stats.mtime.toISOString(),
              type: 'text',
              preview
            };
          } catch {
            return null;
          }
        })
      );

      return textItems
        .filter((item): item is LocalTextFileItem => item !== null)
        .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    } else {
      // 处理通用文件
      const fileItems = await Promise.all(
        filteredFiles.map(async (fileName): Promise<LocalGeneralFileItem | null> => {
          try {
            const filePath = path.join(targetDir, fileName);
            const stats = await fs.stat(filePath);

            const extension = path.extname(fileName).toLowerCase();
            const mimeType = getMimeType(extension);
            const downloadPath = `/api/files/download?fileName=${encodeURIComponent(fileName)}`;

            return {
              id: fileName,
              fileName,
              filePath: downloadPath,
              size: stats.size,
              modifiedAt: stats.mtime.toISOString(),
              type: 'file',
              extension,
              mimeType,
              downloadPath
            };
          } catch {
            return null;
          }
        })
      );

      return fileItems
        .filter((item): item is LocalGeneralFileItem => item !== null)
        .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    }
  } catch {
    return [];
  }
}

/**
 * GET - 文件操作
 * 支持的操作：
 * - ?action=scan&type=images|texts|files - 扫描文件
 * - ?action=content&fileName=xxx&type=text|image - 获取文件内容
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const type = searchParams.get('type') as 'images' | 'texts' | 'files' | 'text' | 'image';
    const fileName = searchParams.get('fileName');

    // 扫描文件
    if (action === 'scan') {
      if (!type || (type !== 'images' && type !== 'texts' && type !== 'files')) {
        return NextResponse.json(
          { success: false, error: '无效的文件类型参数' },
          { status: 400 }
        );
      }

      const files = await scanFiles(type);
      return NextResponse.json({
        success: true,
        files,
        count: files.length,
        type
      });
    }

    // 获取文件内容
    if (action === 'content') {
      if (!fileName || !type) {
        return NextResponse.json(
          { success: false, error: '缺少必要参数' },
          { status: 400 }
        );
      }

      const targetDir = type === 'text' ? TEXTS_DIR : PICS_DIR;
      const filePath = validateFilePath(fileName, targetDir);

      try {
        await fs.access(filePath);
      } catch {
        return NextResponse.json(
          { success: false, error: '文件不存在' },
          { status: 404 }
        );
      }

      if (type === 'text') {
        const content = await fs.readFile(filePath, 'utf-8');
        return NextResponse.json({
          success: true,
          content,
          fileName
        });
      } else {
        // 对于图片，返回文件信息
        const stats = await fs.stat(filePath);
        return NextResponse.json({
          success: true,
          fileName,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString()
        });
      }
    }

    return NextResponse.json(
      { success: false, error: '无效的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('文件操作失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - 删除文件
 * 支持的操作：
 * - ?fileName=xxx&type=image|text - 删除单个文件
 * - ?action=clear&type=image|text - 清除所有文件
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const fileName = searchParams.get('fileName');
    const type = searchParams.get('type') as 'image' | 'text';

    if (!type || (type !== 'image' && type !== 'text')) {
      return NextResponse.json(
        { success: false, error: '无效的文件类型参数' },
        { status: 400 }
      );
    }

    const targetDir = type === 'image' ? PICS_DIR : TEXTS_DIR;
    const supportedExtensions = type === 'image' ? SUPPORTED_IMAGE_EXTENSIONS : SUPPORTED_TEXT_EXTENSIONS;

    // 清除所有文件
    if (action === 'clear') {
      await ensureDirectoryExists(targetDir);

      const files = await fs.readdir(targetDir);
      const targetFiles = files.filter(file => isFileSupported(file, supportedExtensions));

      let deletedCount = 0;
      for (const file of targetFiles) {
        try {
          const filePath = path.join(targetDir, file);
          await fs.unlink(filePath);
          deletedCount++;
        } catch (error) {
          console.error(`删除文件 ${file} 失败:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        message: `成功删除 ${deletedCount} 个文件`,
        deletedCount,
        totalCount: targetFiles.length
      });
    }

    // 删除单个文件
    if (fileName) {
      const filePath = validateFilePath(fileName, targetDir);

      try {
        await fs.access(filePath);
      } catch {
        return NextResponse.json(
          { success: false, error: '文件不存在' },
          { status: 404 }
        );
      }

      await fs.unlink(filePath);
      return NextResponse.json({
        success: true,
        message: '文件删除成功',
        fileName
      });
    }

    return NextResponse.json(
      { success: false, error: '缺少必要参数' },
      { status: 400 }
    );
  } catch (error) {
    console.error('删除文件失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
