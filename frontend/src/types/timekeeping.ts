export interface PopulatedUser {
  _id: string;
  username: string;
  email: string;
}

export interface Timekeeping {
  _id: string;
  userId: string;
  date: string | Date;
  checkIn: string | Date | null;
  checkOut: string | Date | null;
  status: TimekeepingStatus;
  workingHours: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type TimekeepingStatus = 
  | 'on_time'      // Đúng giờ
  | 'late'         // Đi muộn
  | 'early_leave'  // Về sớm
  | 'half_day'     // Nửa ngày
  | 'day_off'      // Nghỉ phép
  | 'absent';      // Vắng không phép

export interface TimekeepingInput {
  userId: string;
  date: string | Date;
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  status?: TimekeepingStatus;
}

export interface PopulatedTimekeeping extends Omit<Timekeeping, 'userId'> {
  userId: PopulatedUser;
}

export interface PaginatedTimekeepingResponse {
  data: PopulatedTimekeeping[];
  pagination: {
    totalPages: number;
    currentPage: number;
    totalRecords: number;
  };
}

export interface TimekeepingStats {
  userId: string;
  month: number;
  year: number;
  totalWorkingDays: number;
  presentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  dayOff: number;
  absentDays: number;
  totalWorkingHours: number;
  averageHoursPerDay: number;
}
