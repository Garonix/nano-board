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

// 组件属性类型
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// 白板编辑器属性类型
export interface BoardEditorProps extends ComponentProps {
  // 可以扩展更多属性
}
