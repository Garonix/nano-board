/**
 * 删除图片文件API
 * 支持删除data/pics目录中的图片文件
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 删除指定的图片文件
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('path');
    
    if (!imagePath) {
      return NextResponse.json(
        { error: '缺少图片路径参数' },
        { status: 400 }
      );
    }

    // 安全检查：确保路径在data/pics目录内
    const dataDir = path.join(process.cwd(), 'data', 'pics');
    const fullImagePath = path.join(dataDir, path.basename(imagePath));
    
    // 验证文件路径是否在允许的目录内
    if (!fullImagePath.startsWith(dataDir)) {
      return NextResponse.json(
        { error: '无效的文件路径' },
        { status: 400 }
      );
    }

    // 检查文件是否存在
    try {
      await fs.access(fullImagePath);
    } catch {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 删除文件
    await fs.unlink(fullImagePath);
    
    console.log(`图片文件已删除: ${fullImagePath}`);
    
    return NextResponse.json(
      { 
        success: true,
        message: '图片文件删除成功',
        deletedPath: imagePath
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('删除图片文件失败:', error);
    return NextResponse.json(
      { error: '删除图片文件失败' },
      { status: 500 }
    );
  }
}

/**
 * 批量删除图片文件
 */
export async function POST(request: NextRequest) {
  try {
    const { imagePaths } = await request.json();
    
    if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
      return NextResponse.json(
        { error: '缺少图片路径数组' },
        { status: 400 }
      );
    }

    const dataDir = path.join(process.cwd(), 'data', 'pics');
    const results = [];
    
    for (const imagePath of imagePaths) {
      try {
        const fullImagePath = path.join(dataDir, path.basename(imagePath));
        
        // 验证文件路径是否在允许的目录内
        if (!fullImagePath.startsWith(dataDir)) {
          results.push({
            path: imagePath,
            success: false,
            error: '无效的文件路径'
          });
          continue;
        }

        // 检查文件是否存在
        try {
          await fs.access(fullImagePath);
        } catch {
          results.push({
            path: imagePath,
            success: false,
            error: '文件不存在'
          });
          continue;
        }

        // 删除文件
        await fs.unlink(fullImagePath);
        results.push({
          path: imagePath,
          success: true,
          message: '删除成功'
        });
        
        console.log(`图片文件已删除: ${fullImagePath}`);
        
      } catch (error) {
        results.push({
          path: imagePath,
          success: false,
          error: '删除失败'
        });
        console.error(`删除图片文件失败 ${imagePath}:`, error);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    return NextResponse.json(
      { 
        success: failCount === 0,
        message: `批量删除完成：成功 ${successCount} 个，失败 ${failCount} 个`,
        results
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('批量删除图片文件失败:', error);
    return NextResponse.json(
      { error: '批量删除图片文件失败' },
      { status: 500 }
    );
  }
}
