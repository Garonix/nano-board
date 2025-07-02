/**
 * 文本框工具函数
 * 处理文本框高度自适应、自动滚动等功能
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

/**
 * 防抖函数 - 用于优化自动滚动性能
 * @param func 要防抖的函数
 * @param delay 防抖延迟时间（毫秒）
 * @returns 防抖后的函数
 */
const debounce = (func: (elementId: string, delay?: number) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (elementId: string, scrollDelay?: number) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(elementId, scrollDelay), delay);
  };
};



/**
 * 自动滚动到新增内容 - 普通模式专用
 * 智能滚动：如果是在末尾添加则滚动到底部，如果是在中间添加则滚动到具体元素
 * @param elementId 新增元素的ID或data-block-id
 * @param delay 延迟时间（毫秒），用于等待DOM更新完成
 */
export const autoScrollToNewContent = (elementId: string, delay: number = 100) => {
  setTimeout(() => {
    try {
      // 查找目标元素
      let targetElement = document.getElementById(elementId);
      if (!targetElement) {
        targetElement = document.querySelector(`[data-block-id="${elementId}"]`) as HTMLElement;
      }

      if (!targetElement) {
        scrollToBottom(true);
        return;
      }

      // 检查元素是否是最后一个块
      const allBlocks = document.querySelectorAll('[data-block-id]');
      const isLastBlock = targetElement === allBlocks[allBlocks.length - 1];

      if (isLastBlock) {
        // 如果是最后一个块，滚动到底部
        scrollToBottom(true);
      } else {
        // 如果不是最后一个块，滚动到具体元素
        scrollToElement(targetElement, true);
      }
    } catch (error) {
      console.error('自动滚动出错:', error);
    }
  }, delay);
};

/**
 * 防抖版本的自动滚动函数 - 避免频繁触发
 * 适用于连续输入或快速添加内容的场景
 */
export const debouncedAutoScrollToNewContent = debounce(autoScrollToNewContent, 150);

/**
 * 滚动到页面底部 - 用于添加新文本框后的滚动
 * @param smooth 是否使用平滑滚动
 */
/**
 * 滚动到指定元素
 * @param element 目标元素
 * @param smooth 是否使用平滑滚动
 */
export const scrollToElement = (element: HTMLElement, smooth: boolean = true) => {
  try {
    // 查找普通模式的滚动容器
    const normalModeContainer = document.querySelector('.overflow-auto') as HTMLElement;

    if (normalModeContainer) {
      // 计算元素相对于滚动容器的位置
      const containerRect = normalModeContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // 计算元素在容器中的相对位置
      const elementTop = elementRect.top - containerRect.top + normalModeContainer.scrollTop;

      normalModeContainer.scrollTo({
        top: elementTop - 50, // 留一些上边距
        behavior: smooth ? 'smooth' : 'auto'
      });
    } else {
      // 降级到页面级别滚动
      element.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'center'
      });
    }
  } catch (error) {
    console.error('滚动到元素出错:', error);
    // 降级处理
    element.scrollIntoView({ block: 'center' });
  }
};

export const scrollToBottom = (smooth: boolean = true) => {
  try {
    // 查找普通模式的滚动容器
    const normalModeContainer = document.querySelector('.overflow-auto') as HTMLElement;

    if (normalModeContainer) {
      normalModeContainer.scrollTo({
        top: normalModeContainer.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } else {
      // 降级到页面级别滚动
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  } catch (error) {
    console.error('滚动到底部出错:', error);
    // 降级处理
    window.scrollTo(0, document.documentElement.scrollHeight);
  }
};
