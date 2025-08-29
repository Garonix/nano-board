/**
 * 白板内容API路由
 * 支持普通模式和Markdown模式的独立数据存储
 * 处理白板内容的保存和加载，支持模式参数
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveBoardContent, loadBoardContent, getBoardStorageStatus } from '@/lib/storage';
import { BoardMode } from '@/types';
import { validateDataDirectorySize } from '@/lib/dataSize';

/**
 * GET - 加载白板内容
 * 支持查询参数: ?mode=normal|markdown
 * 支持查询参数: ?status=true 获取存储状态
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') as BoardMode) || 'normal';
    const getStatus = searchParams.get('status') === 'true';

    // 如果请求存储状态
    if (getStatus) {
      const status = await getBoardStorageStatus();
      return NextResponse.json({ status });
    }

    // 验证模式参数
    if (mode !== 'normal' && mode !== 'markdown') {
      return NextResponse.json(
        { error: '无效的模式参数，必须是 normal 或 markdown' },
        { status: 400 }
      );
    }

    const content = await loadBoardContent(mode);
    return NextResponse.json({
      content,
      mode,
      message: `${mode === 'normal' ? '普通模式' : 'Markdown模式'}内容加载成功`
    });
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
 * 支持请求体参数: { content: string, mode?: 'normal'|'markdown' }
 */
export async function POST(request: NextRequest) {
  try {
    const { content, mode = 'normal' } = await request.json();

    // 验证内容格式
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: '内容格式无效，必须是字符串' },
        { status: 400 }
      );
    }

    // 验证模式参数
    if (mode !== 'normal' && mode !== 'markdown') {
      return NextResponse.json(
        { error: '无效的模式参数，必须是 normal 或 markdown' },
        { status: 400 }
      );
    }

    // 验证data目录大小限制
    const contentBuffer = Buffer.from(content, 'utf-8');
    await validateDataDirectorySize(contentBuffer.length);

    await saveBoardContent(content, mode);

    return NextResponse.json({
      success: true,
      mode,
      message: `${mode === 'normal' ? '普通模式' : 'Markdown模式'}内容保存成功`
    });
  } catch (error) {
    console.error('保存白板内容失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存白板内容失败' },
      { status: 500 }
    );
  }
}
