import React, { useEffect, useState } from "react";
import TaskDisplayPage, { Task } from "../../Components/Tasks/TaskDisplayPage";
import TaskService from "../../services/taskService";
import { useAuth } from "../../contexts/AuthContext";
import { message } from "antd";

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
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

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "flex-start" }}>
        {tasks.map((t) => (
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
