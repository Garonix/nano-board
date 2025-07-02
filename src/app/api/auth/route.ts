/**
 * 密码验证API
 * @description 提供应用访问密码验证服务
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAppEnvironment } from '@/lib/env';

/**
 * 验证访问密码
 * @param request - 包含密码的请求体
 * @returns 验证结果
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

    if (!env.enablePasswordAuth) {
      return NextResponse.json({ success: true });
    }

    const correctPassword = env.accessPassword || 'nano2024';
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
 * 获取密码验证配置状态
 * @returns 密码验证是否启用
 */
export async function GET() {
  try {
    const env = getAppEnvironment();

    return NextResponse.json({
      enablePasswordAuth: env.enablePasswordAuth,
    });
  } catch (error) {
    console.error('获取验证状态失败:', error);
    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 }
    );
  }
}
