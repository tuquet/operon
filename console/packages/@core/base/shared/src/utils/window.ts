interface OpenWindowOptions {
  noopener?: boolean;
  noreferrer?: boolean;
  target?: '_blank' | '_parent' | '_self' | '_top' | string;
}

/**
 * Open URL in new window.
 *
 * @param url - URL to open.
 * @param options - Window open options.
 */
function openWindow(url: string, options: OpenWindowOptions = {}): void {
  // Destructure with defaults
  const { noopener = true, noreferrer = true, target = '_blank' } = options;

  // Create features string from options
  const features = [noopener && 'noopener=yes', noreferrer && 'noreferrer=yes']
    .filter(Boolean)
    .join(',');

  // Open window
  window.open(url, target, features);
}

/**
 * Open route in new window.
 * @param path
 */
function openRouteInNewWindow(path: string) {
  const { hash, origin } = location;
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${origin}${hash && !fullPath.startsWith('/#') ? '/#' : ''}${fullPath}`;
  openWindow(url, { target: '_blank' });
}

export { openRouteInNewWindow, openWindow };
