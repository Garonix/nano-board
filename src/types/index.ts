/**
 * 类型定义
 * @description 白板应用的核心类型定义
 */

/** 白板模式 */
export type BoardMode = 'normal' | 'markdown';

/** 白板内容 */
export interface BoardContent {
  content: string;
  lastModified: Date;
}

/** 内容块 */
export interface ContentBlock {
  id: string;
  type: 'text' | 'image';
  content: string;
  alt?: string;
}

/** 图片数据 */
export interface ImageData {
  id: string;
  src: string;
  alt: string;
}

/** 本地文件项基础类型 */
export interface LocalFileItem {
  id: string;
  fileName: string;
  filePath: string;
  size: number;
  modifiedAt: string;
  type: 'image' | 'text';
}

/** 本地图片文件项 */
export interface LocalImageFileItem extends LocalFileItem {
  type: 'image';
  extension: string;
  thumbnailPath?: string;
}

/** 本地文本文件项 */
export interface LocalTextFileItem extends LocalFileItem {
  type: 'text';
  preview: string;
  content?: string;
}

/** 文件历史加载状态 */
export interface FileHistoryLoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/** 历史侧边栏类型 */
export type HistorySidebarType = 'images' | 'texts';

/** 组件基础属性 */
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

/** 白板编辑器属性 */
export interface BoardEditorProps extends ComponentProps {
  mode?: 'normal' | 'markdown';
}

/** 顶部导航栏属性 */
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
  onUpdateBlockContent: (blockId: string, content: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onAddTextBlockAfter: (blockId: string) => void;
  onClearTextBlockContent: (blockId: string) => void;
  onSetFocusedBlockId: (blockId: string) => void;
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
