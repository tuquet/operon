import type { VariantProps } from 'class-variance-authority';

import { cva } from 'class-variance-authority';

export const sheetVariants = cva(
  'bg-background transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 border-border dark:border-neutral-700',
  {
    defaultVariants: {
      side: 'right',
    },
    variants: {
      side: {
        bottom:
          'inset-x-0 bottom-0 border-t border-border dark:border-neutral-700 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.3)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.8)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r border-border dark:border-neutral-700 shadow-[10px_0_20px_-5px_rgba(0,0,0,0.3)] dark:shadow-[10px_0_30px_rgba(0,0,0,0.8)] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
        right:
          'inset-y-0 right-0 w-3/4 border-l border-border dark:border-neutral-700 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.3)] dark:shadow-[-10px_0_30px_rgba(0,0,0,0.8)] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
        top: 'inset-x-0 top-0 border-b border-border dark:border-neutral-700 shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
      },
    },
  },
);

export type SheetVariants = VariantProps<typeof sheetVariants>;
