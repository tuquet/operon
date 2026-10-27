import type { SupportedLanguagesType } from '@operon-core/typings';

export type Locale = SupportedLanguagesType;

export const messages: Partial<Record<Locale, Record<string, string>>> = {
  'en-US': {
    cancel: 'Cancel',
    collapse: 'Collapse',
    confirm: 'Confirm',
    confirmTitle: 'Please Confirm',
    expand: 'Expand',
    prompt: 'Prompt',
    reset: 'Reset',
    submit: 'Submit',
    toggleSidebar: 'Toggle sidebar',
  },
  'vi-VN': {
    cancel: 'Hủy',
    collapse: 'Thu gọn',
    confirm: 'Xác nhận',
    confirmTitle: 'Vui lòng xác nhận',
    expand: 'Mở rộng',
    prompt: 'Thông báo',
    reset: 'Đặt lại',
    submit: 'Gửi',
    toggleSidebar: 'Đóng/mở thanh bên',
  },
  'zh-CN': {
    // fallback
    cancel: 'Cancel',
    collapse: 'Collapse',
    confirm: 'Confirm',
    confirmTitle: 'Please Confirm',
    expand: 'Expand',
    prompt: 'Prompt',
    reset: 'Reset',
    submit: 'Submit',
    toggleSidebar: 'Toggle sidebar',
  },
};

export const getMessages = (locale: Locale) =>
  messages[locale] ?? messages['en-US'] ?? {};
