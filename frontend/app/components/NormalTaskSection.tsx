import React from "react";

interface Task {
  id: number;
  title: string;
  status: boolean;
  persistent?: boolean;
}

interface Props {
  tasks: Task[];
  handleTaskCheckChange: (id: number) => void;
}

const NormalTaskSection: React.FC<Props> = ({ tasks, handleTaskCheckChange }) => {
  // persistentがfalseまたは未定義のものだけ表示
  const normalTasks = tasks.filter(task => !task.persistent);

  return (
    <div className="normal-task-section" style={{ background: "#fffbe7", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", padding: "1rem", marginBottom: "1rem" }}>
      {normalTasks.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {normalTasks.map(task => (
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
        <div>今日だけやることはありません</div>
      )}
    </div>
  );
};

export default NormalTaskSection;
