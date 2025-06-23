/**
 * 图片上传API路由
 * 处理图片文件的保存和管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 图片存储目录
const PICS_DIR = path.join(process.cwd(), 'data', 'pics');

/**
 * 确保图片目录存在
 */
async function ensurePicsDir(): Promise<void> {
  try {
    await fs.access(PICS_DIR);
  } catch {
    await fs.mkdir(PICS_DIR, { recursive: true });
  }
}

/**
 * 生成唯一的文件名
 * @param extension 文件扩展名
 * @returns 唯一文件名
 */
function generateUniqueFileName(extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `image-${timestamp}-${random}${extension}`;
}

/**
 * 从Base64数据中提取文件扩展名
 * @param base64Data Base64数据
 * @returns 文件扩展名
 */
function getExtensionFromBase64(base64Data: string): string {
  const mimeMatch = base64Data.match(/^data:image\/([a-zA-Z]+);base64,/);
  if (mimeMatch) {
    const mimeType = mimeMatch[1];
    switch (mimeType.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        return '.jpg';
      case 'png':
        return '.png';
      case 'gif':
        return '.gif';
      case 'webp':
        return '.webp';
      default:
        return '.png';
    }
  }
  return '.png';
}

/**
 * POST - 保存图片文件
 */
export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json();
    
    if (!imageData || typeof imageData !== 'string') {
      return NextResponse.json(
        { error: '无效的图片数据' },
        { status: 400 }
      );
    }

    // 检查是否为有效的Base64图片数据
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: '不支持的图片格式' },
        { status: 400 }
      );
    }

    await ensurePicsDir();

    // 提取Base64数据
    const base64Data = imageData.split(',')[1];
    if (!base64Data) {
      return NextResponse.json(
        { error: '无效的Base64数据' },
        { status: 400 }
      );
    }

    // 生成文件名
    const extension = getExtensionFromBase64(imageData);
    const fileName = generateUniqueFileName(extension);
    const filePath = path.join(PICS_DIR, fileName);

    // 保存文件
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filePath, buffer);

    // 返回相对路径
    const relativePath = `data/pics/${fileName}`;
    
    console.log(`图片已保存: ${relativePath}`);
    
    return NextResponse.json({ 
      success: true, 
      imagePath: relativePath 
    });
  } catch (error) {
    console.error('保存图片失败:', error);
    return NextResponse.json(
      { error: '保存图片失败' },
      { status: 500 }
    );
  }
}
