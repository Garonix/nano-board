/**
 * 文件上传API
 * @description 处理通用文件的上传、验证和保存功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getAppEnvironment } from '@/lib/env';
import { isSupportedFileType } from '@/lib/fileIcons';

const FILES_DIR = path.join(process.cwd(), 'data', 'files');

/**
 * 确保文件目录存在
 */
async function ensureFilesDir(): Promise<void> {
  try {
    await fs.access(FILES_DIR);
  } catch {
    await fs.mkdir(FILES_DIR, { recursive: true });
  }
}

/**
 * 生成安全的文件名（避免冲突和安全问题）
 * @param originalName 原始文件名
 * @returns 安全的文件名
 */
async function generateSafeFileName(originalName: string): Promise<string> {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_') // 替换特殊字符
    .substring(0, 50); // 限制长度
  
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return `${baseName}_${timestamp}_${randomSuffix}${ext}`;
}

/**
 * 验证文件上传
 * @param file 文件对象
 * @returns 验证结果
 */
async function validateFileUpload(file: File): Promise<void> {
  const env = getAppEnvironment();
  
  // 检查文件大小限制
  if (file.size > env.maxFileSize) {
    throw new Error(`文件大小超过限制 (${Math.round(env.maxFileSize / 1024 / 1024)}MB)`);
  }
  
  // 检查文件类型是否支持
  if (!isSupportedFileType(file.name)) {
    throw new Error('不支持的文件类型，请上传非图片类型的文件');
  }
  
  // 检查文件数量限制
  try {
    const existingFiles = await fs.readdir(FILES_DIR);
    if (existingFiles.length >= env.maxFileCount) {
      throw new Error(`文件数量超过限制 (${env.maxFileCount}个)`);
    }
  } catch (error) {
    // 目录不存在时忽略错误
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}



/**
 * POST - 上传文件
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      );
    }
    
    // 验证文件
    await validateFileUpload(file);
    
    // 确保目录存在
    await ensureFilesDir();
    
    // 生成安全文件名
    const safeFileName = await generateSafeFileName(file.name);
    const filePath = path.join(FILES_DIR, safeFileName);
    
    // 保存文件
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    
    // 返回文件信息
    return NextResponse.json({
      success: true,
      fileName: safeFileName,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
      extension: path.extname(file.name).toLowerCase(),
      downloadPath: `/api/files/download?fileName=${encodeURIComponent(safeFileName)}`,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '文件上传失败' },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取文件列表和统计信息
 */
export async function GET() {
  try {
    await ensureFilesDir();
    
    const files = await fs.readdir(FILES_DIR);
    const env = getAppEnvironment();
    
    const fileStats = await Promise.all(
      files.map(async (fileName) => {
        const filePath = path.join(FILES_DIR, fileName);
        const stats = await fs.stat(filePath);
        return {
          fileName,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          extension: path.extname(fileName).toLowerCase()
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      files: fileStats,
      totalCount: files.length,
      maxCount: env.maxFileCount,
      maxFileSize: env.maxFileSize
    });
  } catch (error) {
    console.error('获取文件列表失败:', error);
    return NextResponse.json(
      { error: '获取文件列表失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - 删除文件
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    
    if (!fileName) {
      return NextResponse.json(
        { error: '未指定文件名' },
        { status: 400 }
      );
    }
    
    // 安全检查：确保文件名不包含路径遍历
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json(
        { error: '无效的文件名' },
        { status: 400 }
      );
    }
    
    const filePath = path.join(FILES_DIR, fileName);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }
    
    // 删除文件
    await fs.unlink(filePath);
    
    return NextResponse.json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    console.error('文件删除失败:', error);
    return NextResponse.json(
      { error: '文件删除失败' },
      { status: 500 }
    );
  }
}
