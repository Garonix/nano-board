/**
 * 清除所有本地文件API路由
 * 处理批量删除data/pics或data/texts目录中的所有文件
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 目录配置
const PICS_DIR = path.join(process.cwd(), 'data', 'pics');
const TEXTS_DIR = path.join(process.cwd(), 'data', 'texts');

// 支持的文件扩展名
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const SUPPORTED_TEXT_EXTENSIONS = ['.txt'];

/**
 * 检查文件扩展名是否支持
 */
function isFileSupported(fileName: string, supportedExtensions: string[]): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return supportedExtensions.includes(ext);
}

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
 * 清除指定目录中的所有支持的文件
 */
async function clearFilesInDirectory(
  dirPath: string, 
  supportedExtensions: string[]
): Promise<{ deletedCount: number; failedCount: number; errors: string[] }> {
  await ensureDirectoryExists(dirPath);
  
  let deletedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  
  try {
    const files = await fs.readdir(dirPath);
    const supportedFiles = files.filter(file => isFileSupported(file, supportedExtensions));
    
    // 逐个删除文件
    for (const fileName of supportedFiles) {
      try {
        const filePath = path.join(dirPath, fileName);
        await fs.unlink(filePath);
        deletedCount++;
        console.log(`文件已删除: ${fileName}`);
      } catch (error) {
        failedCount++;
        const errorMessage = `删除文件 ${fileName} 失败: ${error instanceof Error ? error.message : '未知错误'}`;
        errors.push(errorMessage);
        console.error(errorMessage);
      }
    }
  } catch (error) {
    const errorMessage = `读取目录失败: ${error instanceof Error ? error.message : '未知错误'}`;
    errors.push(errorMessage);
    console.error(errorMessage);
  }
  
  return { deletedCount, failedCount, errors };
}

/**
 * DELETE - 清除指定类型的所有本地文件
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get('type');
    
    if (!fileType || !['image', 'text'].includes(fileType)) {
      return NextResponse.json(
        { error: '无效的文件类型参数，必须是 image 或 text' },
        { status: 400 }
      );
    }
    
    let dirPath: string;
    let supportedExtensions: string[];
    let fileTypeName: string;
    
    // 根据文件类型确定目录和扩展名
    if (fileType === 'image') {
      dirPath = PICS_DIR;
      supportedExtensions = SUPPORTED_IMAGE_EXTENSIONS;
      fileTypeName = '图片';
    } else {
      dirPath = TEXTS_DIR;
      supportedExtensions = SUPPORTED_TEXT_EXTENSIONS;
      fileTypeName = '文本';
    }
    
    // 执行清除操作
    const result = await clearFilesInDirectory(dirPath, supportedExtensions);
    
    // 构建响应消息
    let message = `${fileTypeName}文件清除完成`;
    if (result.deletedCount > 0) {
      message += `，成功删除 ${result.deletedCount} 个文件`;
    }
    if (result.failedCount > 0) {
      message += `，${result.failedCount} 个文件删除失败`;
    }
    
    // 如果有失败的情况，返回部分成功状态
    const success = result.failedCount === 0;
    const statusCode = success ? 200 : 207; // 207 Multi-Status for partial success
    
    return NextResponse.json({
      success,
      type: fileType,
      deletedCount: result.deletedCount,
      failedCount: result.failedCount,
      errors: result.errors,
      message
    }, { status: statusCode });
  } catch (error) {
    console.error('清除本地文件失败:', error);
    return NextResponse.json(
      { error: '清除文件失败' },
      { status: 500 }
    );
  }
}
