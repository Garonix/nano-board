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

// 注意：ImageCacheItem 类型已移除，统一使用 LocalImageFileItem

// 注意：TextHistoryItem 类型已移除，统一使用 LocalTextFileItem

// 本地文件项类型（用于文件系统扫描）
export interface LocalFileItem {
  id: string;
  fileName: string;
  filePath: string;
  size: number;
  modifiedAt: string;
  type: 'image' | 'text';
}

// 图片缓存项类型
export interface LocalImageFileItem extends LocalFileItem {
  type: 'image';
  extension: string;
  thumbnailPath?: string; // 缩略图路径（可选）
}

// 本地文本文件项类型
export interface LocalTextFileItem extends LocalFileItem {
  type: 'text';
  preview: string;
  content?: string; // 完整内容（懒加载）
}

// 文件历史加载状态类型
export interface FileHistoryLoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
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

// 顶部导航栏组件属性类型
export interface TopNavbarProps {
  isMarkdownMode: boolean;
  showMarkdownPreview: boolean;
  isUploadingImage: boolean;
  fileHistoryLoadingState: FileHistoryLoadingState;
  onToggleMarkdownMode: () => void;
  onToggleMarkdownPreview: () => void;
  onClearAllContent: () => void;
  onToggleHistorySidebar: () => Promise<void>;
}

// 普通模式编辑器组件属性类型
export interface NormalModeEditorProps {
  blocks: ContentBlock[];
  focusedBlockId: string;
  isSingleTextBlock: boolean;
  isSavingText: boolean;
  hoveredTextBlockId: string | null;
  onUpdateBlockContent: (blockId: string, content: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onAddTextBlockAfter: (blockId: string) => void;
  onClearTextBlockContent: (blockId: string) => void;
  onSetFocusedBlockId: (blockId: string) => void;
  onSetHoveredTextBlockId: (blockId: string | null) => void;
  onHandleImagePaste: (e: React.ClipboardEvent) => void;
  onHandleKeyDown: (e: React.KeyboardEvent, blockId: string) => void;
  onHandleSaveText: (content: string) => Promise<void>;
}

// Markdown 模式编辑器组件属性类型
export interface MarkdownModeEditorProps {
  blocks: ContentBlock[];
  showMarkdownPreview: boolean;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  previewRef: React.RefObject<HTMLDivElement | null>;
  blocksToContent: (blocks: ContentBlock[]) => string;
  contentToBlocks: (content: string) => ContentBlock[];
  onSetBlocks: (blocks: ContentBlock[]) => void;
  onHandleImagePaste: (e: React.ClipboardEvent) => void;
  onHandleMarkdownKeyDown: (e: React.KeyboardEvent) => void;
  onSyncScrollFromEditor?: () => void;
  onSyncScrollFromPreview?: () => void;
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
  // 本地文件历史相关状态（统一数据源）
  localImageFiles: LocalImageFileItem[];
  localTextFiles: LocalTextFileItem[];
  fileHistoryLoadingState: FileHistoryLoadingState;
}
