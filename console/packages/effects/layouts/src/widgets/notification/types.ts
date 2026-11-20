interface NotificationItem {
  id: number | string;
  avatar: string;
  date: string;
  isRead?: boolean;
  message: string;
  title: string;
  /**
   * Navigation target URL: route path or full URL
   * @example '/dashboard' or 'https://example.com'
   */
  link?: string;
  query?: Record<string, any>;
  state?: Record<string, any>;
  /** Business payload */
  [key: string]: any;
}

export type { NotificationItem };
