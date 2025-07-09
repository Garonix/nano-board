/**
 * 文本框工具函数
 */
export const adjustTextareaHeight = (
  textarea: HTMLTextAreaElement,
  _content: string,
  isSingleTextBlock: boolean
) => {
  if (isSingleTextBlock) {
    textarea.style.height = '25rem';
    textarea.style.minHeight = '25rem';
    textarea.style.maxHeight = '25rem';
    textarea.style.transition = 'none';
    textarea.style.overflowY = 'auto';
  } else {
    textarea.style.height = 'auto';
    textarea.style.minHeight = '2.5rem';
    textarea.style.maxHeight = '10rem';
    textarea.style.transition = 'none';
    textarea.style.overflowY = 'auto';
    const newHeight = Math.max(textarea.scrollHeight, 40);
    const maxHeightPx = 160;
    textarea.style.height = `${Math.min(newHeight, maxHeightPx)}px`;
  }
};


export const updateAllTextareasHeight = (isSingleTextBlock: boolean) => {
  const textareas = document.querySelectorAll('textarea:not([data-markdown-editor])');
  textareas.forEach((textarea) => {
    const textareaElement = textarea as HTMLTextAreaElement;
    adjustTextareaHeight(textareaElement, textareaElement.value, isSingleTextBlock);
  });
};

const debounce = (func: (elementId: string, delay?: number) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (elementId: string, scrollDelay?: number) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(elementId, scrollDelay), delay);
  };
};



export const autoScrollToNewContent = (elementId: string, delay: number = 100) => {
  setTimeout(() => {
    try {
      let targetElement = document.getElementById(elementId);
      if (!targetElement) {
        targetElement = document.querySelector(`[data-block-id="${elementId}"]`) as HTMLElement;
      }

      if (!targetElement) {
        console.warn(`未找到目标元素: ${elementId}，降级到底部滚动`);
        scrollToBottom(true);
        return;
      }

      scrollToElement(targetElement, true);

    } catch (error) {
      console.error('自动滚动出错:', error);
      scrollToBottom(true);
    }
  }, delay);
};


export const debouncedAutoScrollToNewContent = debounce(autoScrollToNewContent, 150);

/**
 * 滚动到页面底部 - 用于添加新文本框后的滚动
 * @param smooth 是否使用平滑滚动
 */
/**
 * 智能滚动到指定元素
 * @description 根据元素位置智能调整滚动策略：
 * - 如果元素已在可视区域内，不进行滚动
 * - 如果元素在可视区域下方，滚动使元素底部与视窗底部对齐
 * - 如果元素在可视区域上方，滚动使元素顶部可见
 * @param element 目标元素
 * @param smooth 是否使用平滑滚动
 */
export const scrollToElement = (element: HTMLElement, smooth: boolean = true) => {
  try {
    // 查找普通模式的滚动容器
    const normalModeContainer = document.querySelector('.overflow-auto') as HTMLElement;

    if (normalModeContainer) {
      // 获取容器和元素的位置信息
      const containerRect = normalModeContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // 计算元素相对于滚动容器的绝对位置
      const elementTop = elementRect.top - containerRect.top + normalModeContainer.scrollTop;
      const elementBottom = elementTop + elementRect.height;

      // 获取容器的可视区域信息
      const containerHeight = containerRect.height;
      const currentScrollTop = normalModeContainer.scrollTop;
      const visibleTop = currentScrollTop;
      const visibleBottom = currentScrollTop + containerHeight;

      // 预留边距，确保内容不会紧贴边缘
      const topMargin = 20;
      const bottomMargin = 20;

      // 判断元素是否已在可视区域内
      const isElementVisible =
        elementTop >= (visibleTop + topMargin) &&
        elementBottom <= (visibleBottom - bottomMargin);

      if (!isElementVisible) {
        let targetScrollTop: number;

        if (elementBottom > visibleBottom) {
          // 元素在可视区域下方，滚动使元素底部与视窗底部对齐（留边距）
          targetScrollTop = elementBottom - containerHeight + bottomMargin;
        } else {
          // 元素在可视区域上方，滚动使元素顶部可见（留边距）
          targetScrollTop = elementTop - topMargin;
        }

        // 确保滚动位置在有效范围内
        const maxScrollTop = normalModeContainer.scrollHeight - containerHeight;
        targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));

        normalModeContainer.scrollTo({
          top: targetScrollTop,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    } else {
      // 降级到页面级别滚动 - 使用更智能的滚动策略
      const elementRect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // 检查元素是否在可视区域内
      const isVisible = elementRect.top >= 0 && elementRect.bottom <= windowHeight;

      if (!isVisible) {
        element.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: elementRect.top < 0 ? 'start' : 'end'
        });
      }
    }
  } catch (error) {
    console.error('滚动到元素出错:', error);
    // 降级处理
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
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
