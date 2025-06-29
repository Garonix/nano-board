/**
 * 文本框工具函数
 * 处理文本框高度自适应等功能
 */

/**
 * 自动调整文本框高度 - 优化即时切换
 * @param textarea 文本框元素
 * @param _content 内容（保留参数用于兼容性）
 * @param isSingleTextBlock 是否为单个文本框场景
 *
 * 高度规则：
 * - 单个文本框：锁定高度为25rem
 * - 多个文本框或包含图片：最小2.5rem，最大10rem，根据内容自适应
 */
export const adjustTextareaHeight = (
  textarea: HTMLTextAreaElement,
  _content: string,
  isSingleTextBlock: boolean
) => {
  if (isSingleTextBlock) {
    // 单个文本框时，锁定高度为25rem
    textarea.style.height = '25rem';
    textarea.style.minHeight = '25rem';
    textarea.style.maxHeight = '25rem';
    textarea.style.transition = 'none'; // 禁用过渡动画确保即时切换
    textarea.style.overflowY = 'auto'; // 确保超出时显示滚动条
  } else {
    // 多个文本框或包含图片时，根据内容动态调整高度，最大高度限制为10rem
    textarea.style.height = 'auto';
    textarea.style.minHeight = '2.5rem';
    textarea.style.maxHeight = '10rem';
    textarea.style.transition = 'none'; // 禁用过渡动画确保即时切换
    textarea.style.overflowY = 'auto'; // 确保超出时显示滚动条
    const newHeight = Math.max(textarea.scrollHeight, 40);
    // 限制最大高度为10rem (160px，假设1rem=16px)
    const maxHeightPx = 160;
    textarea.style.height = `${Math.min(newHeight, maxHeightPx)}px`;
  }
};

/**
 * 批量更新所有文本框高度
 * @param isSingleTextBlock 是否为单个文本框场景
 *
 * 注意：此函数只处理普通模式的 textarea，不影响 Markdown 模式的固定高度设置
 */
export const updateAllTextareasHeight = (isSingleTextBlock: boolean) => {
  // 只选择普通模式的 textarea，排除 Markdown 编辑器的 textarea
  // Markdown 编辑器的 textarea 有 data-markdown-editor 属性，需要保持固定高度以支持滚动同步
  const textareas = document.querySelectorAll('textarea:not([data-markdown-editor])');
  textareas.forEach((textarea) => {
    const textareaElement = textarea as HTMLTextAreaElement;
    adjustTextareaHeight(textareaElement, textareaElement.value, isSingleTextBlock);
  });
};
