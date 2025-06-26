/**
 * 删除本地文件API路由
 * 处理删除data/pics和data/texts目录中的文件
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 目录配置
const PICS_DIR = path.join(process.cwd(), 'data', 'pics');
const TEXTS_DIR = path.join(process.cwd(), 'data', 'texts');

/**
 * 验证文件路径安全性
 */
function validateFilePath(fileName: string, baseDir: string): string {
  // 使用 path.basename 确保只获取文件名，防止路径遍历攻击
  const safeFileName = path.basename(fileName);
  const fullPath = path.join(baseDir, safeFileName);
  
  // 验证文件路径是否在允许的目录内
  if (!fullPath.startsWith(baseDir)) {
    throw new Error('无效的文件路径');
  }
  
  return fullPath;
}

/**
 * DELETE - 删除指定的本地文件
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const fileType = searchParams.get('type');
    
    if (!fileName) {
      return NextResponse.json(
        { error: '缺少文件名参数' },
        { status: 400 }
      );
    }
    
    if (!fileType || !['image', 'text'].includes(fileType)) {
      return NextResponse.json(
        { error: '无效的文件类型参数，必须是 image 或 text' },
        { status: 400 }
      );
    }
    
    let baseDir: string;
    let fullFilePath: string;
    
    // 根据文件类型确定目录
    if (fileType === 'image') {
      baseDir = PICS_DIR;
    } else {
      baseDir = TEXTS_DIR;
    }
    
    try {
      fullFilePath = validateFilePath(fileName, baseDir);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '文件路径验证失败' },
        { status: 400 }
      );
    }
    
    // 检查文件是否存在
    try {
      await fs.access(fullFilePath);
    } catch {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }
    
    // 删除文件
    try {
      await fs.unlink(fullFilePath);
      
      console.log(`本地文件已删除: ${fileName} (${fileType})`);
      
      return NextResponse.json({
        success: true,
        fileName,
        type: fileType,
        message: '文件删除成功'
      });
    } catch (error) {
      console.error('删除文件失败:', error);
      return NextResponse.json(
        { error: '删除文件失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('删除本地文件失败:', error);
    return NextResponse.json(
      { error: '删除文件失败' },
      { status: 500 }
    );
  }
}
