import type { CSSProperties } from 'vue';

import type { ClassType } from '@operon/types';

export interface CaptchaData {
  /**
   * x
   */
  x: number;
  /**
   * y
   */
  y: number;
  /**
   * Timestamp
   */
  t: number;
}
export interface CaptchaPoint extends CaptchaData {
  /**
   * Data index
   */
  i: number;
}
export interface PointSelectionCaptchaCardProps {
  /**
   * Captcha image
   */
  captchaImage: string;
  /**
   * Captcha image height
   * @default '220px'
   */
  height?: number | string;
  /**
   * Horizontal padding
   * @default '12px'
   */
  paddingX?: number | string;
  /**
   * Vertical padding
   * @default '16px'
   */
  paddingY?: number | string;
  /**
   * Title
   * @default 'Click in order according to the clue'
   */
  title?: string;
  /**
   * Captcha image width
   * @default '300px'
   */
  width?: number | string;
}

export interface PointSelectionCaptchaProps extends PointSelectionCaptchaCardProps {
  /**
   * Whether to display confirm button
   * @default false
   */
  showConfirm?: boolean;
  /**
   * Clue image
   * @default ''
   */
  hintImage?: string;
  /**
   * Clue text
   * @default ''
   */
  hintText?: string;
}

export interface SliderCaptchaProps {
  class?: ClassType;
  /**
   * @description Slider style
   * @default {}
   */
  actionStyle?: CSSProperties;

  /**
   * @description Slider track style
   * @default {}
   */
  barStyle?: CSSProperties;

  /**
   * @description Content style
   * @default {}
   */
  contentStyle?: CSSProperties;

  /**
   * @description Component style
   * @default {}
   */
  wrapperStyle?: CSSProperties;

  /**
   * @description Whether used as slot for linked component
   * @default false
   */
  isSlot?: boolean;

  /**
   * @description Success message
   * @default 'Verification successful'
   */
  successText?: string;

  /**
   * @description Hint text
   * @default 'Drag the slider'
   */
  text?: string;
}

export interface SliderRotateCaptchaProps {
  /**
   * @description Rotation angle
   * @default 20
   */
  diffDegree?: number;

  /**
   * @description Image width
   * @default 260
   */
  imageSize?: number;

  /**
   * @description Image style
   * @default {}
   */
  imageWrapperStyle?: CSSProperties;

  /**
   * @description Maximum rotation angle
   * @default 270
   */
  maxDegree?: number;

  /**
   * @description Minimum rotation angle
   * @default 90
   */
  minDegree?: number;

  /**
   * @description Image URL
   */
  src?: string;
  /**
   * @description Default hint text
   */
  defaultTip?: string;
}

export interface SliderTranslateCaptchaProps {
  /**
   * @description Puzzle width
   * @default 420
   */
  canvasWidth?: number;
  /**
   * @description Puzzle height
   * @default 280
   */
  canvasHeight?: number;
  /**
   * @description Square side length on tile
   * @default 42
   */
  squareLength?: number;
  /**
   * @description Circle radius on tile
   * @default 10
   */
  circleRadius?: number;
  /**
   * @description Image URL
   */
  src?: string;
  /**
   * @description Maximum allowed offset tolerance
   * @default 3
   */
  diffDistance?: number;
  /**
   * @description Default hint text
   */
  defaultTip?: string;
}

export interface CaptchaVerifyPassingData {
  isPassing: boolean;
  time: number | string;
}

export interface SliderCaptchaActionType {
  resume: () => void;
}

export interface SliderRotateVerifyPassingData {
  event: MouseEvent | TouchEvent;
  moveDistance: number;
  moveX: number;
}
