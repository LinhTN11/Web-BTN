import axios, { AxiosError } from "axios";
import { Task, CreateTaskInput } from "../Components/Tasks/TaskDisplayPage";

const BASE_URL = "http://localhost:3000/v1";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const getAuthHeader = (token: string | null) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Enhanced error logging function
const logError = (operation: string, error: any) => {
  console.error(`❌ ${operation} failed:`, {
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers,
      data: error.config?.data,
    }
  });
};

const TaskService = {
  getTasksByUserId: async (userId: string, token: string | null) => {
    try {
      console.log('🔍 Sending request to get tasks');
      console.log('📋 User ID:', userId);
      console.log('🔑 Token:', token ? 'Present' : 'Missing');

      const response = await axios.get<ApiResponse<Task[]>>(
        `${BASE_URL}/tasks`, {
          params: { assignedTo: userId },
          headers: getAuthHeader(token),
        }
      );

      console.log('✅ Response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch tasks');
      }

      return response.data;
    } catch (error: any) {
      logError('Get Tasks', error);
      throw new Error(error.response?.data?.message || 'Error fetching tasks');
    }
  },

  createTask: async (task: CreateTaskInput, token: string | null) => {
    try {
      console.log('➕ Creating task:', task);
      
      const response = await axios.post<ApiResponse<Task>>(
        `${BASE_URL}/tasks`,
        task,
        { headers: getAuthHeader(token) }
      );
      
      console.log('✅ Task created:', response.data);
      return response.data;
    } catch (error: any) {
      logError('Create Task', error);
      throw new Error(error.response?.data?.message || 'Error creating task');
    }
  },

  updateTask: async (taskId: string, updates: Partial<Task>, token: string | null) => {
    try {
      console.log('🔄 Updating task:', taskId);
      console.log('📝 Updates:', updates);
      console.log('🔑 Token:', token ? 'Present' : 'Missing');
      
      // Validate inputs
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new Error('Updates object is empty');
      }

      // Clean the updates object - remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      console.log('🧹 Cleaned updates:', cleanUpdates);

      // Check if token exists
      if (!token) {
        console.warn('⚠️ No token provided for update request');
      }

      const config = {
        headers: {
          ...getAuthHeader(token),
          'Content-Type': 'application/json'
        }
      };

      console.log('🌐 Request config:', {
        url: `${BASE_URL}/tasks/${taskId}`,
        method: 'PATCH',
        headers: config.headers,
        data: cleanUpdates
      });

      const response = await axios.patch<ApiResponse<Task>>(
        `${BASE_URL}/tasks/${taskId}`, 
        cleanUpdates,
        config
      );
      
      console.log('✅ Update response:', response.data);
      return response.data;
    } catch (error: any) {
      logError('Update Task', error);
      
      // More specific error messages
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || 'Unknown server error';
        
        switch (status) {
          case 400:
            throw new Error(`Bad Request: ${message}`);
          case 401:
            throw new Error('Unauthorized: Please check your authentication token');
          case 403:
            throw new Error('Forbidden: You do not have permission to update this task');
          case 404:
            throw new Error('Task not found');
          case 422:
            throw new Error(`Validation Error: ${message}`);
          case 500:
            throw new Error('Internal Server Error: Please try again later');
          default:
            throw new Error(`Server Error (${status}): ${message}`);
        }
      } else if (error.request) {
        throw new Error('Network Error: Unable to reach the server');
      } else {
        throw new Error(error.message || 'Unexpected error occurred');
      }
    }
  },

  getAllTasksForAdmin: async (token: string | null) => {
    try {
      console.log('👑 Admin: Sending request to get all tasks');
      
      const response = await axios.get<ApiResponse<Task[]>>(
        `${BASE_URL}/tasks/all`, {
          headers: getAuthHeader(token),
        }
      );

      console.log('✅ Admin: Response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch tasks');
      }

      return response.data;
    } catch (error: any) {
      logError('Get All Tasks (Admin)', error);
      throw new Error(error.response?.data?.message || 'Error fetching all tasks');
    }
  },

  deleteTask: async (taskId: string, token: string | null) => {
    try {
      console.log('🗑️ Deleting task:', taskId);
      
      const response = await axios.delete<ApiResponse<null>>(
        `${BASE_URL}/tasks/${taskId}`,
        { headers: getAuthHeader(token) }
      );
      
      console.log('✅ Delete response:', response.data);
      return response.data;
    } catch (error: any) {
      logError('Delete Task', error);
      throw new Error(error.response?.data?.message || 'Error deleting task');
    }
  },

  // Debug method to test connection
  testConnection: async (token: string | null) => {
    try {
      console.log('🔧 Testing API connection...');
      
      const response = await axios.get(`${BASE_URL}/health`, {
        headers: getAuthHeader(token),
      });
      
      console.log('✅ Connection test successful:', response.data);
      return response.data;
    } catch (error: any) {
      logError('Connection Test', error);
      throw error;
    }
  },

  // Method to validate task data before sending
  validateTaskUpdate: (updates: Partial<Task>) => {
    const validFields = ['title', 'description', 'status', 'priority', 'assignedTo', 'dueDate'];
    const invalidFields = Object.keys(updates).filter(field => !validFields.includes(field));
    
    if (invalidFields.length > 0) {
      console.warn('⚠️ Invalid fields detected:', invalidFields);
    }

    // Check for required data types
    if (updates.title && typeof updates.title !== 'string') {
      throw new Error('Title must be a string');
    }
    
    if (updates.status && typeof updates.status !== 'string') {
      throw new Error('Status must be a string');
    }

    return true;
  }
};

export default TaskService;