export function createEmptyDb() {
  return {
    notes: [],
    tasks: [],
    taskTemplates: [],
    projects: [],
    events: [],
    habits: [],
    journal: [],
    transactions: [],
    bookmarks: [],
    goals: [],
    activity: [],
    notifications: [],
    settings: {
      theme: "dark",
      accent: "#f2f2f4",
      weekStart: 1,
      focusDur: 25,
      shortBreak: 5,
      longBreak: 15,
      locale: "fr",
      fontScale: "md",
      fontFamily: "geist",
      uiOverrides: {},
    },
    profile: {
      name: "",
      email: "",
      username: "",
      fullName: "",
      phone: "",
      phoneVisible: false,
      photoUrl: "",
    },
    subscription: {
      plan: "summit",
      status: "complimentary",
      billingCycle: "lifetime",
      startedAt: "",
      renewsAt: "",
      stripeCustomerId: "",
      stripeSubscriptionId: "",
      stripePriceId: "",
      stripeCheckoutSessionId: "",
    },
  };
}

function clampText(value, max = 4000) {
  return `${value || ""}`.slice(0, max);
}

function clampArray(list, max = 500) {
  return Array.isArray(list) ? list.slice(0, max) : [];
}

function clampEnum(value, accepted, fallback) {
  return accepted.includes(value) ? value : fallback;
}

function normalizeEventAttendees(list) {
  return clampArray(list, 12).map((item) => ({
    uid: clampText(item?.uid, 80),
    name: clampText(item?.name, 120),
    email: clampText(item?.email, 180),
    username: clampText(item?.username, 40),
    phone: clampText(item?.phone, 30),
    photoUrl: clampText(item?.photoUrl, 4_000_000),
    status: clampText(item?.status || "confirmed", 20),
  }));
}

function normalizeLinks(input) {
  const links = input && typeof input === "object" ? input : {};
  return {
    contacts: clampArray(links.contacts, 12).map((item) => ({
      id: clampText(item?.id, 80),
      name: clampText(item?.name, 120),
      username: clampText(item?.username, 40),
      phone: clampText(item?.phone, 30),
    })),
    conversations: clampArray(links.conversations, 12).map((item) => ({
      id: clampText(item?.id, 80),
      title: clampText(item?.title, 160),
    })),
    events: clampArray(links.events, 12).map((item) => ({
      id: clampText(item?.id, 80),
      title: clampText(item?.title, 160),
      date: clampText(item?.date, 20),
    })),
    bookmarks: clampArray(links.bookmarks, 12).map((item) => ({
      id: clampText(item?.id, 80),
      title: clampText(item?.title, 160),
      url: clampText(item?.url, 2000),
    })),
    notes: clampArray(links.notes, 12).map((item) => ({
      id: clampText(item?.id, 80),
      title: clampText(item?.title, 160),
    })),
  };
}

function normalizeUiOverrideEntry(input = {}) {
  return {
    x: Math.max(-400, Math.min(400, Number(input?.x) || 0)),
    y: Math.max(-400, Math.min(400, Number(input?.y) || 0)),
    width: Math.max(0, Math.min(1600, Number(input?.width) || 0)),
    minHeight: Math.max(0, Math.min(1600, Number(input?.minHeight) || 0)),
    padding: Math.max(0, Math.min(120, Number(input?.padding) || 0)),
    radius: Math.max(0, Math.min(120, Number(input?.radius) || 0)),
    fontScale: Math.max(0.7, Math.min(1.8, Number(input?.fontScale) || 1)),
    opacity: Math.max(0.4, Math.min(1, Number(input?.opacity) || 1)),
    blur: Math.max(0, Math.min(24, Number(input?.blur) || 0)),
  };
}

function normalizeUiOverrideProfile(input = {}) {
  if (input && (input.desktop || input.mobile)) {
    return {
      desktop: normalizeUiOverrideEntry(input.desktop || {}),
      mobile: normalizeUiOverrideEntry(input.mobile || {}),
    };
  }
  return {
    desktop: normalizeUiOverrideEntry(input || {}),
    mobile: normalizeUiOverrideEntry({}),
  };
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
      links: normalizeLinks(item?.links),
    })),
    tasks: clampArray(db.tasks).map((item) => ({
      ...item,
      title: clampText(item?.title, 180),
      desc: clampText(item?.desc, 4000),
      prio: clampText(item?.prio, 10),
      due: clampText(item?.due, 20),
      ownerId: clampText(item?.ownerId || user?.uid || "", 80),
      status: clampEnum(item?.status, ["todo", "in_progress", "review", "done"], "todo"),
      updatedAt: clampText(item?.updatedAt || item?.createdAt || "", 40),
      templateId: clampText(item?.templateId || "", 80),
      reactions: item?.reactions && typeof item.reactions === "object"
        ? Object.fromEntries(
            Object.entries(item.reactions)
              .slice(0, 20)
              .map(([uid, emoji]) => [clampText(uid, 80), clampText(emoji, 8)]),
          )
        : {},
      members: clampArray(item?.members, 16).map((member) => ({
        uid: clampText(member?.uid, 80),
        name: clampText(member?.name, 120),
        email: clampText(member?.email, 180),
        username: clampText(member?.username, 40),
        role: clampEnum(member?.role, ["viewer", "editor"], "viewer"),
      })),
      subtasks: clampArray(item?.subtasks, 24).map((subtask) => ({
        id: clampText(subtask?.id, 80),
        title: clampText(subtask?.title, 180),
        done: Boolean(subtask?.done),
        createdAt: clampText(subtask?.createdAt || "", 40),
        doneAt: clampText(subtask?.doneAt || "", 40),
      })),
      comments: clampArray(item?.comments, 40).map((comment) => ({
        id: clampText(comment?.id, 80),
        body: clampText(comment?.body, 1200),
        createdAt: clampText(comment?.createdAt || "", 40),
        author: {
          uid: clampText(comment?.author?.uid, 80),
          name: clampText(comment?.author?.name, 120),
          email: clampText(comment?.author?.email, 180),
          username: clampText(comment?.author?.username, 40),
        },
      })),
      links: normalizeLinks(item?.links),
    })),
    taskTemplates: clampArray(db.taskTemplates, 40).map((item) => ({
      id: clampText(item?.id, 80),
      title: clampText(item?.title, 180),
      desc: clampText(item?.desc, 4000),
      prio: clampText(item?.prio, 10),
      dueOffsetDays: Math.max(0, Math.min(365, Number(item?.dueOffsetDays) || 0)),
      subtasks: clampArray(item?.subtasks, 24).map((subtask) => ({
        id: clampText(subtask?.id, 80),
        title: clampText(subtask?.title, 180),
      })),
      members: clampArray(item?.members, 16).map((member) => ({
        uid: clampText(member?.uid, 80),
        name: clampText(member?.name, 120),
        email: clampText(member?.email, 180),
        username: clampText(member?.username, 40),
        role: clampEnum(member?.role, ["viewer", "editor"], "viewer"),
      })),
      createdAt: clampText(item?.createdAt || "", 40),
      updatedAt: clampText(item?.updatedAt || item?.createdAt || "", 40),
    })),
    projects: clampArray(db.projects),
    events: clampArray(db.events).map((item) => ({
      ...item,
      title: clampText(item?.title, 180),
      desc: clampText(item?.desc, 4000),
      date: clampText(item?.date, 20),
      time: clampText(item?.time, 20),
      endTime: clampText(item?.endTime, 20),
      color: clampText(item?.color, 32),
      sharedEventId: clampText(item?.sharedEventId || item?.id, 80),
      createdBy: clampText(item?.createdBy, 80),
      participantIds: clampArray(item?.participantIds, 12).map((entry) => clampText(entry, 80)).filter(Boolean),
      attendees: normalizeEventAttendees(item?.attendees),
      links: normalizeLinks(item?.links),
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
      type: clampEnum(item?.type, ["link", "image", "text"], "link"),
      url: clampText(item?.url, 2000),
      icon: clampText(item?.icon, 32),
      text: clampText(item?.text, 16_000),
      note: clampText(item?.note, 4_000),
      coverUrl: clampText(item?.coverUrl, 900_000),
      previewTitle: clampText(item?.previewTitle, 180),
      previewText: clampText(item?.previewText, 2_000),
      sourceLabel: clampText(item?.sourceLabel, 120),
      mediaKind: clampText(item?.mediaKind, 40),
      links: normalizeLinks(item?.links),
    })),
    goals: clampArray(db.goals).map((item) => ({
      ...item,
      title: clampText(item?.title, 180),
      deadline: clampText(item?.deadline, 20),
      progress: Math.max(0, Math.min(100, Number(item?.progress) || 0)),
    })),
    activity: clampArray(db.activity, 120).map((item) => ({
      id: clampText(item?.id, 80),
      type: clampText(item?.type, 40),
      title: clampText(item?.title, 140),
      detail: clampText(item?.detail, 240),
      createdAt: clampText(item?.createdAt, 40),
    })),
    notifications: clampArray(db.notifications, 120).map((item) => ({
      id: clampText(item?.id, 80),
      type: clampText(item?.type, 40),
      title: clampText(item?.title, 160),
      detail: clampText(item?.detail, 240),
      createdAt: clampText(item?.createdAt, 40),
      readAt: clampText(item?.readAt, 40),
      href: clampText(item?.href, 80),
      entityId: clampText(item?.entityId, 80),
    })),
    settings: {
      ...base.settings,
      ...(db.settings && typeof db.settings === "object" ? db.settings : {}),
      theme: clampEnum(db.settings?.theme, ["dark", "light"], base.settings.theme),
      accent: clampText(db.settings?.accent || base.settings.accent, 32),
      weekStart: Math.max(0, Math.min(6, Number(db.settings?.weekStart) || base.settings.weekStart)),
      focusDur: Math.max(5, Math.min(120, Number(db.settings?.focusDur) || base.settings.focusDur)),
      shortBreak: Math.max(1, Math.min(60, Number(db.settings?.shortBreak) || base.settings.shortBreak)),
      longBreak: Math.max(5, Math.min(90, Number(db.settings?.longBreak) || base.settings.longBreak)),
      locale: clampEnum(db.settings?.locale, ["fr", "en"], base.settings.locale),
      fontScale: clampEnum(db.settings?.fontScale, ["sm", "md", "lg"], base.settings.fontScale),
      fontFamily: clampEnum(db.settings?.fontFamily, ["geist", "system", "serif"], base.settings.fontFamily),
      uiOverrides: db.settings?.uiOverrides && typeof db.settings.uiOverrides === "object"
        ? Object.fromEntries(
            Object.entries(db.settings.uiOverrides)
              .slice(0, 80)
              .map(([key, value]) => [
                clampText(key, 60),
                normalizeUiOverrideProfile(value),
              ]),
          )
        : base.settings.uiOverrides,
    },
    profile: {
      name: clampText(user?.name || db.profile?.name || "", 120),
      email: clampText(user?.email || db.profile?.email || "", 180),
      username: clampText(db.profile?.username || "", 40),
      fullName: clampText(db.profile?.fullName || user?.name || db.profile?.name || "", 140),
      phone: clampText(db.profile?.phone || "", 30),
      phoneVisible: Boolean(db.profile?.phoneVisible),
      photoUrl: clampText(db.profile?.photoUrl || "", 4_000_000),
    },
    subscription: {
      ...base.subscription,
      ...(db.subscription && typeof db.subscription === "object" ? db.subscription : {}),
      plan: clampEnum(db.subscription?.plan, ["starter", "pro", "summit"], base.subscription.plan),
      status: clampEnum(db.subscription?.status, ["complimentary", "active", "past_due", "canceled"], base.subscription.status),
      billingCycle: clampEnum(db.subscription?.billingCycle, ["monthly", "yearly", "lifetime"], base.subscription.billingCycle),
      startedAt: clampText(db.subscription?.startedAt || "", 40),
      renewsAt: clampText(db.subscription?.renewsAt || "", 40),
      stripeCustomerId: clampText(db.subscription?.stripeCustomerId || "", 120),
      stripeSubscriptionId: clampText(db.subscription?.stripeSubscriptionId || "", 120),
      stripePriceId: clampText(db.subscription?.stripePriceId || "", 120),
      stripeCheckoutSessionId: clampText(db.subscription?.stripeCheckoutSessionId || "", 120),
    },
  };
}
