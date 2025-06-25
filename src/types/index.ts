/**
 * 极简白板应用的类型定义
 * 支持普通模式和Markdown模式的独立数据结构
 */

// 白板模式类型
export type BoardMode = 'normal' | 'markdown';

// 白板内容类型
export interface BoardContent {
  content: string;
  lastModified: Date;
}

// 内容块类型
export interface ContentBlock {
  id: string;
  type: 'text' | 'image';
  content: string; // 文本内容或图片URL
  alt?: string; // 图片alt文本
}

// 图片数据类型
export interface ImageData {
  id: string;
  src: string;
  alt: string;
}

// 图片缓存项类型
export interface ImageCacheItem {
  id: string;
  src: string;
  alt: string;
  timestamp: Date;
  fileSize?: number; // 文件大小（可选）
}

// 本地图片缓存数据类型
export interface LocalImageCacheData {
  items: ImageCacheItem[];
  lastUpdated: Date;
}

// 文本历史项类型
export interface TextHistoryItem {
  id: string;
  fileName: string;
  preview: string;
  createdAt: string;
  size: number;
}

// 历史侧边栏类型
export type HistorySidebarType = 'images' | 'texts';

// 组件属性类型
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// 白板编辑器属性类型
export interface BoardEditorProps extends ComponentProps {
  mode?: 'normal' | 'markdown'; // 可以扩展更多属性
}

// 滚动同步配置类型
export interface ScrollSyncConfig {
  enabled: boolean;
  debounceMs: number;
}

// 编辑器状态类型
export interface EditorState {
  blocks: ContentBlock[];
  isMarkdownMode: boolean;
  showMarkdownPreview: boolean;
  isLoading: boolean;
  isUploadingImage: boolean;
  isDragOver: boolean;
  focusedBlockId: string;
  showHistorySidebar: boolean;
  historySidebarType: HistorySidebarType;
  cachedImages: ImageCacheItem[];
  textHistory: TextHistoryItem[];
}
