import { DatabaseItem } from '../services/database';

export interface Task extends DatabaseItem {
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  category?: string;
  userId?: string;
  commentaire?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  category?: string;
  userId?: string;
  completed: boolean;
  commentaire?: string;
} 