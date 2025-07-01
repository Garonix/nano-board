/**
 * 密码验证 API
 * 提供安全的密码验证服务
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAppEnvironment } from '@/lib/env';

/**
 * POST - 验证密码
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: '密码不能为空' },
        { status: 400 }
      );
    }

    const env = getAppEnvironment();
    
    // 如果未启用密码验证，直接返回成功
    if (!env.enablePasswordAuth) {
      return NextResponse.json({ success: true });
    }

    // 获取正确的密码（优先使用自定义密码，否则使用默认密码）
    const correctPassword = env.accessPassword || 'nano2024';

    // 验证密码
    const isValid = password === correctPassword;

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('密码验证失败:', error);
    return NextResponse.json(
      { success: false, error: '验证失败' },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取密码验证状态
 */
export async function GET() {
  try {
    const env = getAppEnvironment();
    
    return NextResponse.json({
      enablePasswordAuth: env.enablePasswordAuth,
      // 不返回实际密码，只返回是否启用了密码验证
    });
  } catch (error) {
    console.error('获取验证状态失败:', error);
    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 }
    );
  }
}
