import React, { useEffect, useState } from "react";
import TaskDisplayPage, { Task } from "../../Components/Tasks/TaskDisplayPage";
import TaskService from "../../services/taskService";
import { useAuth } from "../../contexts/AuthContext";
import { message, Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";

// Define status order for sorting
const statusOrder = {
  todo: 0,
  in_progress: 1,
  overdue: 2,
  done: 3,
  failed: 4
};

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, token } = useAuth();

  const fetchTasks = async () => {
    try {
      if (!user?._id || !token) return;

      const response = user.role === 'admin' 
        ? await TaskService.getAllTasksForAdmin(token)
        : await TaskService.getTasksByUserId(user._id, token);

      if (response.success) {
        // Convert string dates to Date objects
        const tasksWithDates = response.data.map(task => ({
          ...task,
          deadline: new Date(task.deadline),
          createdAt: new Date(task.createdAt),
          receivedAt: task.receivedAt ? new Date(task.receivedAt) : undefined
        }));
        setTasks(tasksWithDates);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      message.error("Không thể tải danh sách công việc.");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user, token]);

  // Filter and sort tasks
  const filteredAndSortedTasks = tasks
    .filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // First sort by status order
      const statusComparison = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      
      // If status is the same, sort by deadline
      if (statusComparison === 0) {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      
      return statusComparison;
    });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Input
          placeholder="Tìm kiếm theo tiêu đề..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "flex-start" }}>
        {filteredAndSortedTasks.map((t) => (
          <TaskDisplayPage 
            key={t._id} 
            task={t} 
            token={token}
            onTaskUpdated={fetchTasks}
          />
        ))}
      </div>
    </div>
  );
};

export default TasksPage;