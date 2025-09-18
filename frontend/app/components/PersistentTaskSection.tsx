import React from "react";

// Task型の定義（props受け渡し用）
interface Task {
  id: number;
  title: string;
  status: boolean;
  persistent: boolean;
}

interface Props {
  tasks: Task[];
  handleTaskCheckChange: (id: number) => void;
}

// 毎日やることだけを抽出して表示
const PersistentTaskSection: React.FC<Props> = ({ tasks, handleTaskCheckChange }) => {
  const persistentTasks = tasks.filter(task => task.persistent);

  return (
    <div className="persistent-task-section" style={{ background: "#f8f9fa", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", padding: "1rem", marginBottom: "1rem" }}>
      {persistentTasks.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {persistentTasks.map(task => (
            <li key={task.id} style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={task.status}
                  onChange={() => handleTaskCheckChange(task.id)}
                  style={{ marginRight: "0.5rem" }}
                />
                {task.title}
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <div>毎日やることはありません</div>
      )}
    </div>
  );
};

export default PersistentTaskSection;
