/**
 * 文件下载API
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const FILES_DIR = path.join(process.cwd(), 'data', 'files');


function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    // 文档类
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    
    // 表格类
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    
    // 演示文稿类
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // 压缩类
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    
    // 代码类
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.jsx': 'text/jsx',
    '.tsx': 'text/tsx',
    '.py': 'text/x-python',
    '.java': 'text/x-java-source',
    '.cpp': 'text/x-c++src',
    '.c': 'text/x-csrc',
    '.html': 'text/html',
    '.css': 'text/css',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    
    // 音频类
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    
    // 视频类
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    
    // 字体类
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 验证文件名安全性
 * @param fileName 文件名
 * @returns 是否安全
 */
function isValidFileName(fileName: string): boolean {
  // 检查是否包含路径遍历字符
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }
  
  // 检查是否为空或只包含空白字符
  if (!fileName.trim()) {
    return false;
  }
  
  // 检查文件名长度
  if (fileName.length > 255) {
    return false;
  }
  
  return true;
}

/**
 * GET - 下载文件
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const download = searchParams.get('download') === 'true';
    
    if (!fileName) {
      return NextResponse.json(
        { error: '未指定文件名' },
        { status: 400 }
      );
    }
    
    // 验证文件名安全性
    if (!isValidFileName(fileName)) {
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
    
    // 读取文件
    const fileBuffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);
    
    // 获取MIME类型
    const mimeType = getMimeType(fileName);
    
    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Length', stats.size.toString());
    headers.set('Last-Modified', stats.mtime.toUTCString());
    
    // 如果是下载请求，设置下载头
    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    } else {
      // 内联显示（如果浏览器支持）
      headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    }
    
    // 设置缓存头
    headers.set('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    headers.set('ETag', `"${stats.mtime.getTime()}-${stats.size}"`);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('文件下载失败:', error);
    return NextResponse.json(
      { error: '文件下载失败' },
      { status: 500 }
    );
  }
}

/**
 * HEAD - 获取文件信息（不返回文件内容）
 */
export async function HEAD(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    
    if (!fileName) {
      return new NextResponse(null, { status: 400 });
    }
    
    // 验证文件名安全性
    if (!isValidFileName(fileName)) {
      return new NextResponse(null, { status: 400 });
    }
    
    const filePath = path.join(FILES_DIR, fileName);
    
    // 检查文件是否存在
    try {
      const stats = await fs.stat(filePath);
      
      // 获取MIME类型
      const mimeType = getMimeType(fileName);
      
      // 设置响应头
      const headers = new Headers();
      headers.set('Content-Type', mimeType);
      headers.set('Content-Length', stats.size.toString());
      headers.set('Last-Modified', stats.mtime.toUTCString());
      headers.set('ETag', `"${stats.mtime.getTime()}-${stats.size}"`);
      
      return new NextResponse(null, {
        status: 200,
        headers
      });
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  } catch (error) {
    console.error('获取文件信息失败:', error);
    return new NextResponse(null, { status: 500 });
  }
}
