export function buildCalendarCells(year, month, events) {
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const today = new Date();
  const cells = [];
  const eventsByDate = new Map();

  (Array.isArray(events) ? events : []).forEach((event) => {
    if (!event?.date) return;
    const list = eventsByDate.get(event.date) || [];
    list.push(event);
    eventsByDate.set(event.date, list);
  });

  for (let i = startDay - 1; i >= 0; i -= 1) cells.push({ num: prevDays - i, other: true });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      num: day,
      ds: date,
      today: day === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
      events: eventsByDate.get(date) || [],
    });
  }
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i += 1) cells.push({ num: i, other: true });
  return cells;
}

export function reorderKeys(list, draggedKey, targetKey) {
  if (!draggedKey || !targetKey || draggedKey === targetKey) return list;
  const items = Array.isArray(list) ? [...list] : [];
  const draggedIndex = items.indexOf(draggedKey);
  const targetIndex = items.indexOf(targetKey);
  if (draggedIndex < 0 || targetIndex < 0) return items;
  items.splice(draggedIndex, 1);
  items.splice(targetIndex, 0, draggedKey);
  return items;
}

export function parseCallRoomName(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("meet.jit.si")) return parsed.pathname.replace(/^\/+/, "").trim();
  } catch {}
  return "";
}

export function buildJitsiRoomUrl(roomName, mode = "video") {
  const safeRoom = `${roomName || ""}`.replace(/[^a-z0-9-]/gi, "").slice(0, 80) || `flow-room-${Date.now()}`;
  const params = [
    "config.prejoinPageEnabled=false",
    "config.disableDeepLinking=true",
    "config.enableWelcomePage=false",
  ];
  if (mode === "audio") params.push("config.startWithVideoMuted=true");
  return `https://meet.jit.si/${safeRoom}#${params.join("&")}`;
}

export function sortConversationsList(list, preferences = {}) {
  return [...(Array.isArray(list) ? list : [])].sort((left, right) => {
    const leftFavorite = preferences?.[left.id]?.favorite ? 1 : 0;
    const rightFavorite = preferences?.[right.id]?.favorite ? 1 : 0;
    if (leftFavorite !== rightFavorite) return rightFavorite - leftFavorite;
    return `${right.lastMessageAt || ""}`.localeCompare(`${left.lastMessageAt || ""}`);
  });
}

export function fmtDurationSeconds(totalSeconds = 0) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

