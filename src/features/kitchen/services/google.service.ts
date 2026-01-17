import {
  createTaskInList,
  fetchTasksList,
  getGoogleConnectionSafe,
  updateTaskInList,
} from '@/features/google/google-edge.service';

export type GoogleTaskStatus = 'needsAction' | 'completed';

export interface GoogleTaskItem {
  id: string;
  title: string;
  status: GoogleTaskStatus;
  completed?: string;
  updated?: string;
}

export interface GoogleConnection {
  id: string;
  userId: string;
  gmailAddress: string;
  groceryListId?: string;
}

export const getGoogleConnection = async (userId: string): Promise<GoogleConnection | null> => {
  try {
    const data = await getGoogleConnectionSafe(userId);
    if (!data) return null;

    return {
      id: data.id,
      userId: data.userId,
      gmailAddress: data.gmailAddress || '',
      groceryListId: data.groceryListId || undefined,
    };
  } catch (err) {
    console.error('Failed to get Google connection:', err);
    return null;
  }
};

export const getTasksWithAuth = async (
  userId: string,
  taskListId: string
): Promise<GoogleTaskItem[]> => {
  try {
    const connection = await getGoogleConnectionSafe(userId);
    if (!connection) throw new Error('unauthorized');

    const data = await fetchTasksList(taskListId);
    return (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      completed: item.completed,
      updated: item.updated,
    }));
  } catch (err) {
    console.error('Get tasks error:', err);
    throw err;
  }
};

export const createTaskWithAuth = async (
  userId: string,
  taskListId: string,
  title: string
): Promise<GoogleTaskItem> => {
  try {
    const connection = await getGoogleConnectionSafe(userId);
    if (!connection) throw new Error('unauthorized');

    const data = await createTaskInList(taskListId, title);
    return { id: data.id, title: data.title, status: data.status, completed: data.completed, updated: data.updated };
  } catch (err) {
    console.error('Create task error:', err);
    throw err;
  }
};

export const updateTaskStatusWithAuth = async (
  userId: string,
  taskListId: string,
  taskId: string,
  status: GoogleTaskStatus
): Promise<GoogleTaskItem> => {
  try {
    const connection = await getGoogleConnectionSafe(userId);
    if (!connection) throw new Error('unauthorized');

    const data = await updateTaskInList(taskListId, taskId, status);
    return { id: data.id, title: data.title, status: data.status, completed: data.completed, updated: data.updated };
  } catch (err) {
    console.error('Update task error:', err);
    throw err;
  }
};
