/**
 * 文本保存API路由
 * 处理普通模式下的文本内容保存到独立文件
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 文本存储目录
const TEXTS_DIR = path.join(process.cwd(), 'data', 'texts');

/**
 * 确保文本目录存在
 */
async function ensureTextsDir(): Promise<void> {
  try {
    await fs.access(TEXTS_DIR);
  } catch {
    await fs.mkdir(TEXTS_DIR, { recursive: true });
  }
}

/**
 * 生成安全的文件名
 * @param content 文本内容
 * @returns 安全的文件名
 */
function generateSafeFileName(content: string): string {
  if (!content.trim()) {
    return '空白内容';
  }

  // 取前5个字符作为文件名
  let fileName = content.trim().substring(0, 5);

  // 如果内容少于5个字符，使用全部内容
  if (content.trim().length < 5) {
    fileName = content.trim();
  }

  // 文件名安全处理：移除或替换特殊字符
  fileName = fileName
    .replace(/[<>:"/\\|?*]/g, '_') // 替换Windows不允许的字符
    .replace(/[\x00-\x1f\x80-\x9f]/g, '_') // 替换控制字符
    .replace(/^\.+/, '_') // 不能以点开头
    .replace(/\s+/g, '_') // 空格替换为下划线
    .trim();

  // 如果处理后为空，使用默认名称
  if (!fileName) {
    fileName = '未命名文本';
  }

  return fileName;
}

/**
 * 生成唯一的文件路径
 * @param baseFileName 基础文件名
 * @returns 唯一的文件路径
 */
async function generateUniqueFilePath(baseFileName: string): Promise<string> {
  let counter = 1;
  let fileName = `${baseFileName}.txt`;
  let filePath = path.join(TEXTS_DIR, fileName);

  // 检查文件是否存在，如果存在则添加数字后缀
  while (true) {
    try {
      await fs.access(filePath);
      // 文件存在，尝试下一个数字
      fileName = `${baseFileName}_${counter}.txt`;
      filePath = path.join(TEXTS_DIR, fileName);
      counter++;
    } catch {
      // 文件不存在，可以使用这个路径
      break;
    }
  }

  return filePath;
}

/**
 * POST - 保存文本内容到独立文件
 */
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: '内容格式无效，必须是字符串' },
        { status: 400 }
      );
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: '不能保存空白内容' },
        { status: 400 }
      );
    }

    await ensureTextsDir();

    // 生成安全的文件名
    const safeFileName = generateSafeFileName(content);

    // 生成唯一的文件路径
    const filePath = await generateUniqueFilePath(safeFileName);

    // 保存纯文本内容（不使用JSON格式）
    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      fileName: path.basename(filePath),
      message: '文本保存成功'
    });
  } catch (error) {
    console.error('保存文本失败:', error);
    return NextResponse.json(
      { error: '保存文本失败' },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取所有保存的文本文件列表
 */
export async function GET() {
  try {
    await ensureTextsDir();

    const files = await fs.readdir(TEXTS_DIR);
    const textFiles = files.filter(file => file.endsWith('.txt'));

    const textList = await Promise.all(
      textFiles.map(async (fileName) => {
        try {
          const filePath = path.join(TEXTS_DIR, fileName);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');

          // 直接从纯文本内容生成预览
          const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;

          return {
            id: fileName.replace('.txt', ''),
            fileName,
            preview: preview || '无预览',
            createdAt: stats.birthtime.toISOString(),
            size: stats.size
          };
        } catch (error) {
          console.error(`读取文件 ${fileName} 失败:`, error);
          return null;
        }
      })
    );

    // 过滤掉读取失败的文件，按创建时间倒序排列
    const validTextList = textList
      .filter(item => item !== null)
      .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

    return NextResponse.json({
      success: true,
      texts: validTextList
    });
  } catch (error) {
    console.error('获取文本列表失败:', error);
    return NextResponse.json(
      { error: '获取文本列表失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - 删除指定的文本文件
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json(
        { error: '缺少文件名参数' },
        { status: 400 }
      );
    }

    // 安全检查：确保路径在data/texts目录内
    const fullFilePath = path.join(TEXTS_DIR, path.basename(fileName));

    // 验证文件路径是否在允许的目录内
    if (!fullFilePath.startsWith(TEXTS_DIR)) {
      return NextResponse.json(
        { error: '无效的文件路径' },
        { status: 400 }
      );
    }

    // 检查文件是否存在
    try {
      await fs.access(fullFilePath);
    } catch {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 删除文件
    await fs.unlink(fullFilePath);

    return NextResponse.json({
      success: true,
      message: '文本文件删除成功'
    });
  } catch (error) {
    return NextResponse.json(
      { error: '删除文本文件失败' },
      { status: 500 }
    );
  }
}
