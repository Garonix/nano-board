/**
 * 对话框管理Hook
 * 提供现代化的确认和提示对话框功能，替代原生的alert和confirm
 */

'use client';

import { useState, useCallback } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmType?: 'primary' | 'danger';
}

export interface AlertOptions {
  title?: string;
  message: string;
  confirmText?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface DialogState {
  isConfirmOpen: boolean;
  isAlertOpen: boolean;
  confirmOptions: ConfirmOptions | null;
  alertOptions: AlertOptions | null;
  confirmResolve: ((value: boolean) => void) | null;
  alertResolve: (() => void) | null;
}

/**
 * 对话框管理Hook
 */
export const useDialog = () => {
  const [state, setState] = useState<DialogState>({
    isConfirmOpen: false,
    isAlertOpen: false,
    confirmOptions: null,
    alertOptions: null,
    confirmResolve: null,
    alertResolve: null,
  });

  /**
   * 显示确认对话框
   * @param options 对话框选项
   * @returns Promise<boolean> 用户选择结果
   */
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState(prev => ({
        ...prev,
        isConfirmOpen: true,
        confirmOptions: options,
        confirmResolve: resolve,
      }));
    });
  }, []);

  /**
   * 显示提示对话框
   * @param options 对话框选项
   * @returns Promise<void>
   */
  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setState(prev => ({
        ...prev,
        isAlertOpen: true,
        alertOptions: options,
        alertResolve: resolve,
      }));
    });
  }, []);

  /**
   * 关闭确认对话框
   */
  const closeConfirm = useCallback(() => {
    setState(prev => {
      if (prev.confirmResolve) {
        prev.confirmResolve(false);
      }
      return {
        ...prev,
        isConfirmOpen: false,
        confirmOptions: null,
        confirmResolve: null,
      };
    });
  }, []);

  /**
   * 确认对话框
   */
  const handleConfirm = useCallback(() => {
    setState(prev => {
      if (prev.confirmResolve) {
        prev.confirmResolve(true);
      }
      return {
        ...prev,
        isConfirmOpen: false,
        confirmOptions: null,
        confirmResolve: null,
      };
    });
  }, []);

  /**
   * 关闭提示对话框
   */
  const closeAlert = useCallback(() => {
    setState(prev => {
      if (prev.alertResolve) {
        prev.alertResolve();
      }
      return {
        ...prev,
        isAlertOpen: false,
        alertOptions: null,
        alertResolve: null,
      };
    });
  }, []);

  return {
    // 对话框状态
    isConfirmOpen: state.isConfirmOpen,
    isAlertOpen: state.isAlertOpen,
    confirmOptions: state.confirmOptions,
    alertOptions: state.alertOptions,
    
    // 对话框方法
    confirm,
    alert,
    closeConfirm,
    handleConfirm,
    closeAlert,
  };
};

/**
 * 便捷的确认函数
 * @param message 确认消息
 * @param options 额外选项
 */
export const createConfirm = (confirm: (options: ConfirmOptions) => Promise<boolean>) => {
  return (message: string, options?: Partial<ConfirmOptions>): Promise<boolean> => {
    return confirm({
      message,
      ...options,
    });
  };
};

/**
 * 便捷的提示函数
 * @param message 提示消息
 * @param options 额外选项
 */
export const createAlert = (alert: (options: AlertOptions) => Promise<void>) => {
  return (message: string, options?: Partial<AlertOptions>): Promise<void> => {
    return alert({
      message,
      ...options,
    });
  };
};
