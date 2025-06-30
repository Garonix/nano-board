/**
 * 现代化模态框组件
 * 提供居中显示的弹窗，与项目风格保持一致
 */

'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  /** 是否显示模态框 */
  isOpen: boolean;
  /** 关闭模态框的回调 */
  onClose: () => void;
  /** 模态框标题 */
  title?: string;
  /** 模态框内容 */
  children: React.ReactNode;
  /** 自定义样式类名 */
  className?: string;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 点击遮罩层是否关闭 */
  closeOnOverlayClick?: boolean;
}

/**
 * 现代化模态框组件
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  showCloseButton = true,
  closeOnOverlayClick = true
}) => {
  // 处理ESC键关闭
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={cn(
          'bg-surface-elevated rounded-lg shadow-xl border border-border w-96 max-w-[90vw] max-h-[90vh] overflow-hidden animate-scale-fade-in',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 模态框头部 */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-border">
            {title && (
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-foreground hover:bg-neutral-100 rounded-lg transition-all duration-200"
                title="关闭"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 模态框内容 */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * 确认对话框组件
 */
export interface ConfirmDialogProps {
  /** 是否显示对话框 */
  isOpen: boolean;
  /** 关闭对话框的回调 */
  onClose: () => void;
  /** 确认的回调 */
  onConfirm: () => void;
  /** 对话框标题 */
  title?: string;
  /** 对话框消息 */
  message: string;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 取消按钮文本 */
  cancelText?: string;
  /** 确认按钮类型 */
  confirmType?: 'primary' | 'danger';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmType = 'primary'
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      showCloseButton={false}
      closeOnOverlayClick={false}
    >
      <div className="space-y-6">
        {/* 消息内容 */}
        <p className="text-foreground leading-relaxed">{message}</p>

        {/* 按钮组 */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-surface text-foreground border border-border hover:bg-neutral-50 hover:border-neutral-300"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-white shadow-sm hover:shadow-md',
              confirmType === 'danger'
                ? 'bg-red-500 border border-red-500 hover:bg-red-600 hover:border-red-600'
                : 'bg-primary-600 border border-primary-600 hover:bg-primary-700 hover:border-primary-700'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/**
 * 提示对话框组件
 */
export interface AlertDialogProps {
  /** 是否显示对话框 */
  isOpen: boolean;
  /** 关闭对话框的回调 */
  onClose: () => void;
  /** 对话框标题 */
  title?: string;
  /** 对话框消息 */
  message: string;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 对话框类型 */
  type?: 'info' | 'success' | 'warning' | 'error';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = '确定',
  type = 'info'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-12 h-12 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      showCloseButton={false}
      closeOnOverlayClick={false}
    >
      <div className="text-center space-y-6">
        {getIcon()}
        <p className="text-foreground leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-primary-600 text-white border border-primary-600 hover:bg-primary-700 hover:border-primary-700 shadow-sm hover:shadow-md"
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};
