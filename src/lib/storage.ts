/**
 * 本地文件存储服务
 * 将白板内容保存到项目本地文件
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BoardContent } from '@/types';

// 数据存储目录
const DATA_DIR = path.join(process.cwd(), 'data');
const BOARD_FILE = path.join(DATA_DIR, 'board.json');

/**
 * 确保数据目录存在
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * 保存白板内容到本地文件
 * @param content 白板内容
 */
export async function saveBoardContent(content: string): Promise<void> {
  try {
    await ensureDataDir();

    const boardData: BoardContent = {
      content,
      lastModified: new Date(),
    };

    await fs.writeFile(BOARD_FILE, JSON.stringify(boardData, null, 2), 'utf-8');
    console.log('白板内容已保存到本地文件');
  } catch (error) {
    console.error('保存白板内容失败:', error);
    throw error;
  }
}

/**
 * 从本地文件加载白板内容
 * @returns 白板内容
 */
export async function loadBoardContent(): Promise<string> {
  try {
    await ensureDataDir();

    const data = await fs.readFile(BOARD_FILE, 'utf-8');
    const boardData: BoardContent = JSON.parse(data);

    console.log('白板内容已从本地文件加载');
    return boardData.content || '';
  } catch {
    // 文件不存在或读取失败时返回空内容
    console.log('未找到本地白板文件，返回空内容');
    return '';
  }
}

/**
 * 检查本地文件是否存在
 * @returns 是否存在
 */
export async function boardFileExists(): Promise<boolean> {
  try {
    await fs.access(BOARD_FILE);
    return true;
  } catch {
    return false;
  }
}
