import { z } from 'zod';

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  status: z.string(),
  label: z.string(),
  priority: z.string(),
  assignee: z.string(),
  favorite: z.boolean(),
  progress: z.number().min(0).max(100),
  updatedAt: z.string(),
});

export type Task = z.infer<typeof taskSchema>;

export interface TaskDraft {
  title: string;
  status: string;
  label: string;
  priority: string;
  assignee: string;
  favorite: boolean;
  progress: number;
}
