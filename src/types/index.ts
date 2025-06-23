/**
 * 极简白板应用的类型定义
 * 简化的数据结构，专注于核心功能
 */

// 白板内容类型
export interface BoardContent {
  content: string;
  lastModified: Date;
}

// 组件属性类型
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}
