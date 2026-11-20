import type { CubicBezierPoints, EasingFunction } from '@vueuse/core';

import type { StyleValue } from 'vue';

import { TransitionPresets as TransitionPresetsData } from '@vueuse/core';

export type TransitionPresets = keyof typeof TransitionPresetsData;

export const TransitionPresetsKeys = Object.keys(
  TransitionPresetsData,
) as TransitionPresets[];

export interface CountToProps {
  /** Initial value */
  startVal?: number;
  /** Current value */
  endVal: number;
  /** Whether animation is disabled */
  disabled?: boolean;
  /** Delay before animation starts */
  delay?: number;
  /** Duration */
  duration?: number;
  /** Decimal places */
  decimals?: number;
  /** Decimal symbol */
  decimal?: string;
  /** Thousand separator */
  separator?: string;
  /** Prefix */
  prefix?: string;
  /** Suffix */
  suffix?: string;
  /** Transition easing effect */
  transition?: CubicBezierPoints | EasingFunction | TransitionPresets;
  /** Integer part class name */
  mainClass?: string;
  /** Decimal part class name */
  decimalClass?: string;
  /** Prefix part class name */
  prefixClass?: string;
  /** Suffix part class name */
  suffixClass?: string;

  /** Integer part style */
  mainStyle?: StyleValue;
  /** Decimal part style */
  decimalStyle?: StyleValue;
  /** Prefix part style */
  prefixStyle?: StyleValue;
  /** Suffix part style */
  suffixStyle?: StyleValue;
}
