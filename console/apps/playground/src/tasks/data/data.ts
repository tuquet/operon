import type { Component } from 'vue';

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Circle,
  CircleOff,
  HelpCircle,
  Timer,
} from '@lucide/vue';

export const labels = [
  {
    value: 'bug',
    label: 'Bug',
    badgeClass:
      'border-rose-500/25 bg-rose-500/8 text-rose-600 dark:text-rose-400',
  },
  {
    value: 'feature',
    label: 'Feature',
    badgeClass: 'border-sky-500/25 bg-sky-500/8 text-sky-600 dark:text-sky-400',
  },
  {
    value: 'documentation',
    label: 'Docs',
    badgeClass:
      'border-violet-500/25 bg-violet-500/8 text-violet-600 dark:text-violet-400',
  },
];

export const statuses: {
  dotClass: string;
  icon: Component;
  label: string;
  pillClass: string;
  value: string;
}[] = [
  {
    value: 'backlog',
    label: 'Backlog',
    icon: HelpCircle,
    pillClass: 'border-border bg-muted/50 text-muted-foreground',
    dotClass: 'bg-muted-foreground/60',
  },
  {
    value: 'todo',
    label: 'Todo',
    icon: Circle,
    pillClass:
      'border-amber-500/25 bg-amber-500/8 text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
  {
    value: 'in progress',
    label: 'In Progress',
    icon: Timer,
    pillClass: 'border-sky-500/25 bg-sky-500/8 text-sky-600 dark:text-sky-400',
    dotClass: 'bg-sky-500',
  },
  {
    value: 'done',
    label: 'Done',
    icon: CheckCircle2,
    pillClass:
      'border-emerald-500/25 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
  },
  {
    value: 'canceled',
    label: 'Canceled',
    icon: CircleOff,
    pillClass:
      'border-border/60 bg-muted/30 text-muted-foreground line-through',
    dotClass: 'bg-muted-foreground/40',
  },
];

export const priorities: {
  icon: Component;
  label: string;
  rank: number;
  textClass: string;
  value: string;
}[] = [
  {
    label: 'Low',
    value: 'low',
    rank: 1,
    icon: ArrowDown,
    textClass: 'text-muted-foreground',
  },
  {
    label: 'Medium',
    value: 'medium',
    rank: 2,
    icon: ArrowRight,
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    label: 'High',
    value: 'high',
    rank: 3,
    icon: ArrowUp,
    textClass: 'text-rose-600 font-medium dark:text-rose-400',
  },
];

export const assignees = [
  {
    value: 'linh',
    label: 'Linh Nguyen',
    initials: 'LN',
    role: 'Staff Systems Engineer',
    avatarClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  {
    value: 'alex',
    label: 'Alex Chen',
    initials: 'AC',
    role: 'Runtime Architect',
    avatarClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  },
  {
    value: 'minh',
    label: 'Minh Tran',
    initials: 'MT',
    role: 'Security & Vault Lead',
    avatarClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  },
  {
    value: 'sara',
    label: 'Sara Kim',
    initials: 'SK',
    role: 'Design Engineer',
    avatarClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  {
    value: 'kai',
    label: 'Kai Patel',
    initials: 'KP',
    role: 'Cloud Infra Lead',
    avatarClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  },
];
