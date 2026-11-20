export function useDateFormat() {
  function formatDate(
    dateStr?: null | string,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    if (!dateStr) return '—';
    try {
      const defaultOptions: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        month: '2-digit',
        year: 'numeric',
      };
      return new Date(dateStr).toLocaleString(
        'vi-VN',
        options || defaultOptions,
      );
    } catch {
      return dateStr;
    }
  }

  function formatDateOnly(dateStr?: null | string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  }

  return {
    formatDate,
    formatDateOnly,
  };
}
