/**
 * 获取本地文件内容API路由
 * 处理从data/pics和data/texts目录读取文件内容
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
 * GET - 获取指定本地文件的内容
 */
export async function GET(request: NextRequest) {
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
    
    // 读取文件内容
    try {
      if (fileType === 'text') {
        // 读取文本文件内容
        const fileContent = await fs.readFile(fullFilePath, 'utf-8');
        
        let content: string;
        let metadata: any = {};
        
        // 尝试解析JSON格式的文本文件（兼容现有格式）
        try {
          const textData = JSON.parse(fileContent);
          content = textData.content || fileContent;
          metadata = {
            createdAt: textData.createdAt,
            preview: textData.preview
          };
        } catch {
          // 如果不是JSON格式，直接使用文件内容
          content = fileContent;
        }
        
        return NextResponse.json({
          success: true,
          fileName,
          type: fileType,
          content,
          ...metadata
        });
      } else {
        // 对于图片文件，返回文件信息（不读取二进制内容）
        const stats = await fs.stat(fullFilePath);
        
        return NextResponse.json({
          success: true,
          fileName,
          type: fileType,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          path: `/api/images/pics/${fileName}` // 用于前端访问的路径
        });
      }
    } catch (error) {
      console.error('读取文件内容失败:', error);
      return NextResponse.json(
        { error: '读取文件内容失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('获取本地文件内容失败:', error);
    return NextResponse.json(
      { error: '获取文件内容失败' },
      { status: 500 }
    );
  }
}
