export function getMonthGrid(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const startDay = (start.getDay() + 6) % 7; // понедельник = 0
  const totalDays = end.getDate();

  const cells: (Date | null)[] = [];

  // пустые клетки в начале
  for (let i = 0; i < startDay; i++) {
    cells.push(null);
  }

  // дни месяца
  for (let d = 1; d <= totalDays; d++) {
    cells.push(new Date(date.getFullYear(), date.getMonth(), d));
  }

  // добиваем до полного ряда
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function nextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export function prevMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}
