/**
 * 本地文件存储服务
 * 支持普通模式和Markdown模式的独立数据存储
 * 实现完全隔离的数据管理架构
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BoardContent, BoardMode } from '@/types';

// 数据存储目录
const DATA_DIR = path.join(process.cwd(), 'data');
const NORMAL_BOARD_FILE = path.join(DATA_DIR, 'board-normal.json');
const MARKDOWN_BOARD_FILE = path.join(DATA_DIR, 'board-markdown.json');
const LEGACY_BOARD_FILE = path.join(DATA_DIR, 'board.json'); // 兼容旧版本

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
 * 获取指定模式的数据文件路径
 * @param mode 板子模式
 * @returns 文件路径
 */
function getBoardFilePath(mode: BoardMode): string {
  return mode === 'normal' ? NORMAL_BOARD_FILE : MARKDOWN_BOARD_FILE;
}

/**
 * 迁移旧版本数据到新的分离存储架构
 * 将原有的board.json数据迁移到board-normal.json
 */
async function migrateLegacyData(): Promise<void> {
  try {
    // 检查是否存在旧版本文件
    await fs.access(LEGACY_BOARD_FILE);

    // 检查新版本文件是否已存在
    try {
      await fs.access(NORMAL_BOARD_FILE);
      // 新文件已存在，跳过迁移
      return;
    } catch {
      // 新文件不存在，执行迁移
    }

    // 读取旧版本数据
    const legacyData = await fs.readFile(LEGACY_BOARD_FILE, 'utf-8');
    const legacyBoardData: BoardContent = JSON.parse(legacyData);

    // 将数据迁移到普通模式存储
    await fs.writeFile(NORMAL_BOARD_FILE, JSON.stringify({
      content: legacyBoardData.content || '',
      lastModified: new Date(),
    }, null, 2), 'utf-8');

    // 可选：备份旧文件而不是删除
    const backupFile = path.join(DATA_DIR, 'board-legacy-backup.json');
    await fs.copyFile(LEGACY_BOARD_FILE, backupFile);

  } catch (error) {
    // 旧版本文件不存在或迁移失败，这是正常情况
    // 静默处理错误
  }
}

/**
 * 保存指定模式的白板内容到本地文件
 * @param content 白板内容
 * @param mode 板子模式 ('normal' | 'markdown')
 */
export async function saveBoardContent(content: string, mode: BoardMode = 'normal'): Promise<void> {
  try {
    await ensureDataDir();
    await migrateLegacyData(); // 确保数据迁移完成

    const boardData: BoardContent = {
      content,
      lastModified: new Date(),
    };

    const filePath = getBoardFilePath(mode);
    await fs.writeFile(filePath, JSON.stringify(boardData, null, 2), 'utf-8');
  } catch (error) {
    throw error;
  }
}

/**
 * 从本地文件加载指定模式的白板内容
 * @param mode 板子模式 ('normal' | 'markdown')
 * @returns 白板内容
 */
export async function loadBoardContent(mode: BoardMode = 'normal'): Promise<string> {
  try {
    await ensureDataDir();
    await migrateLegacyData(); // 确保数据迁移完成

    const filePath = getBoardFilePath(mode);
    const data = await fs.readFile(filePath, 'utf-8');
    const boardData: BoardContent = JSON.parse(data);
    return boardData.content || '';
  } catch {
    // 文件不存在或读取失败时返回空内容
    return '';
  }
}

/**
 * 检查指定模式的本地文件是否存在
 * @param mode 板子模式 ('normal' | 'markdown')
 * @returns 是否存在
 */
export async function boardFileExists(mode: BoardMode = 'normal'): Promise<boolean> {
  try {
    const filePath = getBoardFilePath(mode);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取所有模式的数据存储状态
 * @returns 各模式的存储状态
 */
export async function getBoardStorageStatus(): Promise<{
  normal: boolean;
  markdown: boolean;
  legacy: boolean;
}> {
  const [normalExists, markdownExists, legacyExists] = await Promise.all([
    boardFileExists('normal'),
    boardFileExists('markdown'),
    fs.access(LEGACY_BOARD_FILE).then(() => true).catch(() => false)
  ]);

  return {
    normal: normalExists,
    markdown: markdownExists,
    legacy: legacyExists
  };
}
