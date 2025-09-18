import React from "react";

interface CalendarProps {
  year: number;
  month: number;
  days: number[];
  achievementDates: { [date: string]: number };
  selectedDate: string;
  handleCalendarClick: (day: number) => void;
}

const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarDisplay({ year, month, days, achievementDates, selectedDate, handleCalendarClick }: CalendarProps) {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const rows: JSX.Element[] = [];
  let cells: JSX.Element[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(<td key={"empty-" + i}></td>);
  }
  days.forEach((day, idx) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isSelected = selectedDate.endsWith(`-${String(day).padStart(2, "0")}`);
    cells.push(
      <td key={day}
        style={{
          padding: "0.5rem",
          cursor: "pointer",
          background: isSelected ? "#e0f7fa" : undefined,
          color: undefined,
          textAlign: "center"
        }}
        onClick={() => handleCalendarClick(day)}>
        {achievementDates[dateStr]
          ? <span className="circle-day">{day}</span>
          : day}
      </td>
    );
    if ((cells.length) % 7 === 0 || day === days.length) {
      rows.push(<tr key={day}>{cells}</tr>);
      cells = [];
    }
  });
  if (cells.length) rows.push(<tr key="last-row">{cells}</tr>);

  return (
    <table style={{ borderCollapse: "collapse", margin: "1rem 0" }}>
      <thead>
        <tr>
          <th colSpan={7}>{year}年{month + 1}月</th>
        </tr>
        <tr>
          {weekLabels.map((w, i) => <th key={i}>{w}</th>)}
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}
