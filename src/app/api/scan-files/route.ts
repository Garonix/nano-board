/**
 * 文件扫描API路由
 * 扫描本地data/pics和data/texts目录，返回文件列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { LocalImageFileItem, LocalTextFileItem } from '@/types';

// 目录配置
const PICS_DIR = path.join(process.cwd(), 'data', 'pics');
const TEXTS_DIR = path.join(process.cwd(), 'data', 'texts');

// 支持的文件扩展名
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const SUPPORTED_TEXT_EXTENSIONS = ['.txt'];

/**
 * 确保目录存在
 */
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
 * 扫描图片文件
 */
async function scanImageFiles(): Promise<LocalImageFileItem[]> {
  await ensureDirectoryExists(PICS_DIR);

  try {
    const files = await fs.readdir(PICS_DIR);
    const imageFiles = files.filter(file => isFileSupported(file, SUPPORTED_IMAGE_EXTENSIONS));

    const imageFileItems = await Promise.all(
      imageFiles.map(async (fileName): Promise<LocalImageFileItem | null> => {
        try {
          const filePath = path.join(PICS_DIR, fileName);
          const stats = await fs.stat(filePath);

          return {
            id: fileName,
            fileName,
            filePath: `/api/images/${fileName}`, // 用于前端访问的路径
            size: stats.size,
            modifiedAt: stats.mtime.toISOString(),
            type: 'image',
            extension: path.extname(fileName).toLowerCase()
          };
        } catch (error) {
          console.error(`读取图片文件 ${fileName} 失败:`, error);
          return null;
        }
      })
    );

    // 过滤掉读取失败的文件，按修改时间倒序排列
    return imageFileItems
      .filter((item): item is LocalImageFileItem => item !== null)
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  } catch (error) {
    console.error('扫描图片文件失败:', error);
    return [];
  }
}

/**
 * 扫描文本文件
 */
async function scanTextFiles(): Promise<LocalTextFileItem[]> {
  await ensureDirectoryExists(TEXTS_DIR);

  try {
    const files = await fs.readdir(TEXTS_DIR);
    const textFiles = files.filter(file => isFileSupported(file, SUPPORTED_TEXT_EXTENSIONS));

    const textFileItems = await Promise.all(
      textFiles.map(async (fileName): Promise<LocalTextFileItem | null> => {
        try {
          const filePath = path.join(TEXTS_DIR, fileName);
          const stats = await fs.stat(filePath);

          // 读取文件内容以生成预览
          let preview = '无预览';
          try {
            const content = await fs.readFile(filePath, 'utf-8');

            // 尝试解析JSON格式的文本文件（兼容现有格式）
            try {
              const textData = JSON.parse(content);
              preview = textData.preview || textData.content?.substring(0, 100) || '无预览';
            } catch {
              // 如果不是JSON格式，直接使用文件内容作为预览
              preview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
            }
          } catch (error) {
            console.error(`读取文本文件内容 ${fileName} 失败:`, error);
          }

          return {
            id: fileName.replace('.txt', ''),
            fileName,
            filePath,
            size: stats.size,
            modifiedAt: stats.mtime.toISOString(),
            type: 'text',
            preview
          };
        } catch (error) {
          console.error(`读取文本文件 ${fileName} 失败:`, error);
          return null;
        }
      })
    );

    // 过滤掉读取失败的文件，按修改时间倒序排列
    return textFileItems
      .filter((item): item is LocalTextFileItem => item !== null)
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  } catch (error) {
    console.error('扫描文本文件失败:', error);
    return [];
  }
}

/**
 * GET - 扫描指定类型的文件
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get('type');

    if (!fileType || !['images', 'texts'].includes(fileType)) {
      return NextResponse.json(
        { error: '无效的文件类型参数，必须是 images 或 texts' },
        { status: 400 }
      );
    }

    let files: (LocalImageFileItem | LocalTextFileItem)[] = [];

    if (fileType === 'images') {
      files = await scanImageFiles();
    } else if (fileType === 'texts') {
      files = await scanTextFiles();
    }

    return NextResponse.json({
      success: true,
      type: fileType,
      count: files.length,
      files
    });
  } catch (error) {
    console.error('扫描文件失败:', error);
    return NextResponse.json(
      { error: '扫描文件失败' },
      { status: 500 }
    );
  }
}
