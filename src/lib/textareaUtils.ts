/**
 * 文本框工具函数
 * 处理文本框高度自适应等功能
 */

/**
 * 自动调整文本框高度 - 优化即时切换
 * @param textarea 文本框元素
 * @param _content 内容（保留参数用于兼容性）
 * @param hasImageBlocks 是否包含图片块
 */
export const adjustTextareaHeight = (
  textarea: HTMLTextAreaElement, 
  _content: string, 
  hasImageBlocks: boolean
) => {
  if (!hasImageBlocks) {
    // 页面中没有图片时，始终保持页面高度，无论是否有内容
    textarea.style.height = 'calc(100vh - 200px)';
    textarea.style.minHeight = 'calc(100vh - 200px)';
    textarea.style.maxHeight = 'calc(100vh - 200px)';
    textarea.style.transition = 'none'; // 禁用过渡动画确保即时切换
  } else {
    // 页面中有图片时，根据内容动态调整高度
    textarea.style.height = 'auto';
    textarea.style.minHeight = '2.5rem';
    textarea.style.maxHeight = 'none';
    textarea.style.transition = 'none'; // 禁用过渡动画确保即时切换
    const newHeight = Math.max(textarea.scrollHeight, 40);
    textarea.style.height = `${newHeight}px`;
  }
};

/**
 * 批量更新所有文本框高度
 * @param hasImageBlocks 是否包含图片块
 */
export const updateAllTextareasHeight = (hasImageBlocks: boolean) => {
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach((textarea) => {
    const textareaElement = textarea as HTMLTextAreaElement;
    adjustTextareaHeight(textareaElement, textareaElement.value, hasImageBlocks);
  });
};
