/**
 * 获取文本内容API路由
 * 处理从data/texts目录读取指定文本文件的内容
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 文本存储目录
const TEXTS_DIR = path.join(process.cwd(), 'data', 'texts');

/**
 * GET - 获取指定文本文件的完整内容
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    
    if (!fileName) {
      return NextResponse.json(
        { error: '缺少文件名参数' },
        { status: 400 }
      );
    }

    // 安全检查：确保路径在data/texts目录内
    const fullFilePath = path.join(TEXTS_DIR, path.basename(fileName));
    
    // 验证文件路径是否在允许的目录内
    if (!fullFilePath.startsWith(TEXTS_DIR)) {
      return NextResponse.json(
        { error: '无效的文件路径' },
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
    const fileContent = await fs.readFile(fullFilePath, 'utf-8');
    const textData = JSON.parse(fileContent);

    return NextResponse.json({
      success: true,
      fileName,
      content: textData.content,
      createdAt: textData.createdAt,
      preview: textData.preview
    });
  } catch (error) {
    console.error('获取文本内容失败:', error);
    return NextResponse.json(
      { error: '获取文本内容失败' },
      { status: 500 }
    );
  }
}
