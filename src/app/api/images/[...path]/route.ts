/**
 * 图片文件访问API路由
 * 提供存储在data/pics目录下的图片文件访问
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * GET - 获取图片文件
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  try {
    const imagePath = resolvedParams.path.join('/');
    const filePath = path.join(process.cwd(), 'data', 'pics', imagePath);

    // 安全检查：确保路径在允许的目录内
    const picsDir = path.join(process.cwd(), 'data', 'pics');
    const resolvedPath = path.resolve(filePath);
    const resolvedPicsDir = path.resolve(picsDir);

    if (!resolvedPath.startsWith(resolvedPicsDir)) {
      return NextResponse.json(
        { error: '无效的文件路径' },
        { status: 403 }
      );
    }

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: '图片文件不存在' },
        { status: 404 }
      );
    }

    // 读取文件
    const fileBuffer = await fs.readFile(filePath);

    // 根据文件扩展名设置Content-Type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'image/png';

    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // 缓存一年
      },
    });
  } catch (error) {
    console.error('获取图片失败:', error);
    return NextResponse.json(
      { error: '获取图片失败' },
      { status: 500 }
    );
  }
}
