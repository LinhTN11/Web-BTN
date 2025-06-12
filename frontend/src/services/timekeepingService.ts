import api from './api';
import { PaginatedTimekeepingResponse, Timekeeping, TimekeepingStats } from '../types/timekeeping';



const timekeepingService = {
  // Check-in
  async checkIn(): Promise<Timekeeping> {
    try {
      const response = await api.post('/timekeeping/checkin');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi thực hiện check-in');
    }
  },

  // Check-out
  async checkOut(): Promise<Timekeeping> {
    try {
      const response = await api.post('/timekeeping/checkout');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi thực hiện check-out');
    }
  },

  // Lấy lịch sử chấm công
  async getTimekeepingHistory(
    userId: string, 
    month?: number, 
    year?: number
  ): Promise<Timekeeping[]> {
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());
      
      const response = await api.get(`/timekeeping/history/${userId}?${params.toString()}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy lịch sử chấm công');
    }
  },

  // Lấy thống kê chấm công
  async getTimekeepingStats(
    userId: string,
    month?: number,
    year?: number
  ): Promise<TimekeepingStats> {
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());
      
      const response = await api.get(`/timekeeping/stats/${userId}?${params.toString()}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy thống kê chấm công');
    }
  },

  // Cập nhật trạng thái chấm công (admin)
  async updateTimekeepingStatus(
    timekeepingId: string, 
    status: string
  ): Promise<Timekeeping> {
    try {
      const response = await api.put(`/timekeeping/${timekeepingId}/status`, { status });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    }
  },

  // Lấy thông tin chấm công hôm nay
  async getTodayTimekeeping(userId: string): Promise<Timekeeping | null> {
    try {
      const today = new Date();
      const response = await this.getTimekeepingHistory(
        userId,
        today.getMonth() + 1,
        today.getFullYear()
      );
      
      const todayStr = today.toISOString().split('T')[0];
      return response.find(
        (record: Timekeeping) => new Date(record.date).toISOString().split('T')[0] === todayStr
      ) || null;
    } catch (error) {
      console.error('Lỗi khi lấy thông tin chấm công hôm nay:', error);
      return null;
    }
  },

  // Lấy toàn bộ lịch sử chấm công (cho admin)
  async getAllTimekeepingHistory(
    params: { page?: number; limit?: number; userId?: string; startDate?: string; endDate?: string }
  ): Promise<PaginatedTimekeepingResponse> {
    try {
      const response = await api.get('/timekeeping/history/all', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy toàn bộ lịch sử chấm công');
    }
  },
};

export default timekeepingService;
