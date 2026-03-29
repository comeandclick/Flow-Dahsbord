export function createEmptyDb() {
  return {
    notes: [],
    tasks: [],
    projects: [],
    events: [],
    habits: [],
    journal: [],
    transactions: [],
    bookmarks: [],
    goals: [],
    activity: [],
    settings: {
      theme: "dark",
      accent: "#c8a96e",
      weekStart: 1,
      focusDur: 25,
      shortBreak: 5,
      longBreak: 15,
    },
    profile: { name: "", email: "" },
  };
}

function clampText(value, max = 4000) {
  return `${value || ""}`.slice(0, max);
}

function clampArray(list, max = 500) {
  return Array.isArray(list) ? list.slice(0, max) : [];
}

export function normalizeDb(input, user) {
  const base = createEmptyDb();
  const db = input && typeof input === "object" ? input : {};

  return {
    ...base,
    ...db,
    notes: clampArray(db.notes).map((item) => ({
      ...item,
      title: clampText(item?.title, 180),
      content: clampText(item?.content, 25000),
      cat: clampText(item?.cat, 40),
      color: clampText(item?.color, 32),
    })),
    tasks: clampArray(db.tasks).map((item) => ({
      ...item,
      title: clampText(item?.title, 180),
      desc: clampText(item?.desc, 4000),
      prio: clampText(item?.prio, 10),
      due: clampText(item?.due, 20),
    })),
    projects: clampArray(db.projects),
    events: clampArray(db.events).map((item) => ({
      ...item,
      title: clampText(item?.title, 180),
      desc: clampText(item?.desc, 4000),
      date: clampText(item?.date, 20),
      time: clampText(item?.time, 20),
      color: clampText(item?.color, 32),
    })),
    habits: clampArray(db.habits).map((item) => ({
      ...item,
      name: clampText(item?.name, 100),
      icon: clampText(item?.icon, 8),
      desc: clampText(item?.desc, 180),
      done: item?.done && typeof item.done === "object" ? item.done : {},
    })),
    journal: clampArray(db.journal).map((item) => ({
      ...item,
      mood: clampText(item?.mood, 8),
      gratitude: clampText(item?.gratitude, 8000),
      text: clampText(item?.text, 20000),
    })),
    transactions: clampArray(db.transactions).map((item) => ({
      ...item,
      description: clampText(item?.description, 180),
      category: clampText(item?.category, 80),
      type: clampText(item?.type, 20),
      amount: Number(item?.amount) || 0,
      date: clampText(item?.date, 20),
    })),
    bookmarks: clampArray(db.bookmarks).map((item) => ({
      ...item,
      title: clampText(item?.title, 180),
      url: clampText(item?.url, 2000),
      icon: clampText(item?.icon, 8),
    })),
    goals: clampArray(db.goals).map((item) => ({
      ...item,
      title: clampText(item?.title, 180),
      deadline: clampText(item?.deadline, 20),
      progress: Math.max(0, Math.min(100, Number(item?.progress) || 0)),
    })),
    activity: clampArray(db.activity),
    settings: {
      ...base.settings,
      ...(db.settings && typeof db.settings === "object" ? db.settings : {}),
    },
    profile: {
      name: clampText(user?.name || db.profile?.name || "", 120),
      email: clampText(user?.email || db.profile?.email || "", 180),
    },
  };
}
