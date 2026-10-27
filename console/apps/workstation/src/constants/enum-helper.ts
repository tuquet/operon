import type { FilterAll } from '@operon/constants';

import { FILTER_ALL } from '@operon/constants';

/**
 * Semantic Status Tone for Shadcn Slate Badges (Sentence case, never uppercase)
 */
export const STATUS_TONE = {
  DANGER: 'danger',
  INFO: 'info',
  NEUTRAL: 'neutral',
  PRIMARY: 'primary',
  SUCCESS: 'success',
  WARNING: 'warning',
} as const;

export type StatusTone = (typeof STATUS_TONE)[keyof typeof STATUS_TONE];

export const STATUS_TONE_VALUES = Object.values(
  STATUS_TONE,
) as readonly StatusTone[];

export interface StatusToneClasses {
  badgeClass: string;
  dotClass: string;
  pulse?: boolean;
}

export const STATUS_TONE_CLASS_MAP: Record<StatusTone, StatusToneClasses> = {
  danger: {
    badgeClass:
      'border-destructive/30 bg-destructive/15 text-destructive dark:text-red-400',
    dotClass: 'bg-destructive dark:bg-red-400',
  },
  info: {
    badgeClass:
      'border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500',
    pulse: true,
  },
  neutral: {
    badgeClass: 'border-border bg-muted text-muted-foreground',
    dotClass: 'bg-muted-foreground/60',
  },
  primary: {
    badgeClass: 'border-primary/30 bg-primary/15 text-primary',
    dotClass: 'bg-primary',
  },
  success: {
    badgeClass:
      'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
  },
  warning: {
    badgeClass:
      'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
};

export interface EnumItemMeta {
  /** Fallback display text when no i18n translator is used or key is raw */
  fallbackLabel?: string;
  /** Canonical i18n key (e.g. 'page.workflows_view.status_published') */
  labelKey: string;
  /** Semantic color tone */
  tone: StatusTone;
}

export interface ResolvedStatusMeta extends EnumItemMeta, StatusToneClasses {}

/**
 * Resolves full badge and dot styling metadata for a status value,
 * safely falling back to `STATUS_TONE.NEUTRAL` for unknown values.
 */
export function getStatusToneMeta<T extends string>(
  status: null | string | undefined,
  metaMap: Record<T, EnumItemMeta>,
): ResolvedStatusMeta {
  const normalized = (status || '') as T;
  const item = metaMap[normalized];
  if (!item) {
    return {
      ...STATUS_TONE_CLASS_MAP.neutral,
      fallbackLabel: status || '—',
      labelKey: status || '',
      tone: STATUS_TONE.NEUTRAL,
    };
  }
  const toneClasses =
    STATUS_TONE_CLASS_MAP[item.tone] ?? STATUS_TONE_CLASS_MAP.neutral;
  return {
    ...toneClasses,
    ...item,
  };
}

export interface BuildEnumFilterOptionsConfig<T extends string> {
  /** i18n key for the "All" option (defaults to 'common.all') */
  allLabelKey?: string;
  /** Explicit translated label for the "All" option (overrides allLabelKey) */
  allLabelText?: string;
  /** Whether to prepend `{ value: FILTER_ALL, label: ... }` (defaults to true) */
  includeAll?: boolean;
  /** Optional explicit ordering/subset of enum values */
  order?: readonly T[];
}

/**
 * Builds an array of `{ label, value }` select options for VbenForm / VxeGrid filters.
 */
export function buildEnumFilterOptions<T extends string>(
  metaMap: Record<T, EnumItemMeta>,
  translate: (key: string) => string,
  options?: BuildEnumFilterOptionsConfig<T>,
): Array<{ label: string; value: FilterAll | T }> {
  const keys = options?.order ?? (Object.keys(metaMap) as T[]);
  const items = keys.map((value) => {
    const meta = metaMap[value];
    const translated = meta?.labelKey ? translate(meta.labelKey) : '';
    const label =
      translated && translated !== meta?.labelKey
        ? translated
        : (meta?.fallbackLabel ?? translated ?? value);
    return {
      label,
      value,
    };
  });

  if (options?.includeAll !== false) {
    const allLabel =
      options?.allLabelText ?? translate(options?.allLabelKey ?? 'common.all');
    return [
      {
        label: allLabel,
        value: FILTER_ALL,
      },
      ...items,
    ];
  }

  return items;
}
