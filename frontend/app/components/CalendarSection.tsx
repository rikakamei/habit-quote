import React from "react";
import CalendarDisplay from "./CalendarDisplay";

interface CalendarSectionProps {
  year: number;
  month: number;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
  days: number[];
  achievementDates: { [date: string]: number };
  selectedDate: string;
  handleCalendarClick: (day: number) => void;
}

export default function CalendarSection({
  year,
  month,
  setYear,
  setMonth,
  days,
  achievementDates,
  selectedDate,
  handleCalendarClick
}: CalendarSectionProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
        <button
          onClick={() => {
            if (month === 0) {
              setYear(year - 1);
              setMonth(11);
            } else {
              setMonth(month - 1);
            }
          }}
          style={{ marginRight: "1rem" }}
        >
          前月
        </button>
        <span style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
          {year}年 {month + 1}月
        </span>
        <button
          onClick={() => {
            if (month === 11) {
              setYear(year + 1);
              setMonth(0);
            } else {
              setMonth(month + 1);
            }
          }}
          style={{ marginLeft: "1rem" }}
        >
          翌月
        </button>
      </div>
      <CalendarDisplay
        year={year}
        month={month}
        days={days}
        achievementDates={achievementDates}
        selectedDate={selectedDate}
        handleCalendarClick={handleCalendarClick}
      />
    </div>
  );
}
