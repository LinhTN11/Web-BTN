import axios from "axios";
import { Task, CreateTaskInput } from "../Components/Tasks/TaskDisplayPage";

const BASE_URL = "http://localhost:3000/v1"; // Update to match backend port

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const getAuthHeader = (token: string | null) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TaskService = {
    getTasksByUserId: async (userId: string, token: string | null) => {
      try {
        console.log(' Sending request to get tasks');
        console.log(' User ID:', userId);
        console.log(' Token:', token ? 'Present' : 'Missing');

        const response = await axios.get<ApiResponse<Task[]>>(
          `${BASE_URL}/tasks`, {
            params: { assignedTo: userId },
            headers: getAuthHeader(token),
          }
        );

        console.log(' Response:', response.data);

        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to fetch tasks');
        }

        return response.data;
      } catch (error: any) {
        console.error(' Error fetching tasks:', error);
        throw new Error(error.response?.data?.message || 'Error fetching tasks');
      }
    },
  
    createTask: async (task: CreateTaskInput, token: string | null) => {
      try {
        const response = await axios.post<ApiResponse<Task>>(
          `${BASE_URL}/tasks`,
          task,
          { headers: getAuthHeader(token) }
        );
        return response.data;
      } catch (error: any) {
        console.error('Error creating task:', error);
        throw new Error(error.response?.data?.message || 'Error creating task');
      }
    },
  
    updateTask: async (taskId: string, updates: Partial<Task>, token: string | null) => {
      try {
        console.log(' Updating task:', taskId);
        console.log(' Updates:', updates);
        
        const response = await axios.patch<ApiResponse<Task>>(
          `${BASE_URL}/tasks/${taskId}`, 
          updates,
          { headers: getAuthHeader(token) }
        );
        
        console.log('📥 Update response:', response.data);
        return response.data;
      } catch (error: any) {
        console.error(' Error updating task:', error);
        throw new Error(error.response?.data?.message || 'Error updating task');
      }
    },
  
    getAllTasksForAdmin: async (token: string | null) => {
      try {
        console.log(' Admin: Sending request to get all tasks');
        
        const response = await axios.get<ApiResponse<Task[]>>(
          `${BASE_URL}/tasks/all`, {
            headers: getAuthHeader(token),
          }
        );

        console.log(' Admin: Response:', response.data);

        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to fetch tasks');
        }

        return response.data;
      } catch (error: any) {
        console.error(' Error fetching all tasks:', error);
        throw new Error(error.response?.data?.message || 'Error fetching all tasks');
      }
    },
};

export default TaskService;