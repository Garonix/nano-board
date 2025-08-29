/**
 * 数据目录大小查询API
 * 提供data目录使用情况的统计信息
 */

import { NextResponse } from 'next/server';
import { getDataSizeInfo } from '@/lib/dataSize';

/**
 * GET - 获取data目录大小统计信息
 */
export async function GET() {
  try {
    const sizeInfo = await getDataSizeInfo();
    
    return NextResponse.json({
      success: true,
      data: sizeInfo
    });
  } catch (error) {
    console.error('获取数据目录大小失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取数据目录大小失败' 
      },
      { status: 500 }
    );
  }
}
