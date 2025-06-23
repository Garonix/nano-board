/**
 * 白板内容API路由
 * 处理白板内容的保存和加载
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveBoardContent, loadBoardContent } from '@/lib/storage';

/**
 * GET - 加载白板内容
 */
export async function GET() {
  try {
    const content = await loadBoardContent();
    return NextResponse.json({ content });
  } catch (error) {
    console.error('加载白板内容失败:', error);
    return NextResponse.json(
      { error: '加载白板内容失败' },
      { status: 500 }
    );
  }
}

/**
 * POST - 保存白板内容
 */
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: '内容格式无效' },
        { status: 400 }
      );
    }
    
    await saveBoardContent(content);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存白板内容失败:', error);
    return NextResponse.json(
      { error: '保存白板内容失败' },
      { status: 500 }
    );
  }
}
