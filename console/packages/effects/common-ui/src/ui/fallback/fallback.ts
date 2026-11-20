interface FallbackProps {
  /**
   * Description
   */
  description?: string;
  /**
   * Home route path
   *  @default /
   */
  homePath?: string;
  /**
   * Default display image
   * @default pageNotFoundSvg
   */
  image?: string;
  /**
   * Built-in type
   */
  status?: '403' | '404' | '500' | 'coming-soon' | 'offline';
  /**
   * Page notice / message
   */
  title?: string;
}
export type { FallbackProps };
