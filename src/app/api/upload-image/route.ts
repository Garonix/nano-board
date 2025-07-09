/**
 * 图片上传API
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const PICS_DIR = path.join(process.cwd(), 'data', 'pics');

async function ensurePicsDir(): Promise<void> {
  try {
    await fs.access(PICS_DIR);
  } catch {
    await fs.mkdir(PICS_DIR, { recursive: true });
  }
}

async function getCurrentImageCount(): Promise<number> {
  try {
    const files = await fs.readdir(PICS_DIR);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });
    return imageFiles.length;
  } catch {
    return 0;
  }
}

async function generateStandardizedFileName(extension: string): Promise<string> {
  const now = new Date();

  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');

  const currentCount = await getCurrentImageCount();
  const index = (currentCount + 1).toString().padStart(3, '0');

  return `${yy}-${mm}-${dd}-${index}${extension}`;
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

    // 生成规范化文件名
    const extension = getExtensionFromBase64(imageData);
    const fileName = await generateStandardizedFileName(extension);
    const filePath = path.join(PICS_DIR, fileName);

    // 保存文件
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filePath, buffer);

    // 返回相对路径
    const relativePath = `data/pics/${fileName}`;

    return NextResponse.json({
      success: true,
      imagePath: relativePath
    });
  } catch (_error) {
    return NextResponse.json(
      { error: '保存图片失败' },
      { status: 500 }
    );
  }
}
