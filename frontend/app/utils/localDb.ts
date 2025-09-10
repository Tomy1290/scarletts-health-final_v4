import AsyncStorage from '@react-native-async-storage/async-storage';

// Types (keep in sync with index.tsx where used)
export type PillTracking = { id: string; date: string; morning_taken: boolean; evening_taken: boolean };
export type DrinksMap = { wasser: number; abnehmkaffee: number; ingwer_knoblauch_tee: number; wasserkur: number; kaffee: number };
export type DrinkTracking = { id: string; date: string; drinks: DrinksMap };
export type WeightEntry = { id: string; date: string; weight: number };
export type WeightGoal = {
  id: string;
  goal_type: 'percentage' | 'fixed_weight';
  start_weight: number;
  target_weight?: number;
  target_percentage?: number;
  start_date: string;
  target_date: string;
  is_active: boolean;
};
export type Achievement = {
  id: string;
  badge_type: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  xp_reward: number;
  requirement_count: number;
  current_count: number;
  is_unlocked: boolean;
  unlocked_at?: string;
};
export type UserStats = {
  id: string;
  total_xp: number;
  current_level: number;
  current_streak_days: number;
  longest_streak: number;
  pills_taken_total: number;
  water_goals_achieved: number;
  weight_entries_total: number;
  perfect_days: number;
};
export type Reminder = { id: string; reminder_type: string; time: string; is_enabled: boolean };
export type AppSettings = { theme: string; language: string; sound_enabled: boolean; vibration_enabled: boolean; analytics_enabled: boolean };

// Storage keys
const K = {
  PILLS: 'db_pills', // Record<date, PillTracking>
  DRINKS: 'db_drinks', // Record<date, DrinkTracking>
  WEIGHTS: 'db_weights', // Record<date, WeightEntry>
  GOALS: 'db_goals', // WeightGoal[]
  REMINDERS: 'db_reminders', // Reminder[]
  SETTINGS: 'db_settings', // AppSettings
  SAVED_MSGS: 'db_saved_messages', // Saved messages array
  USER_STATS: 'db_user_stats',
  ACHIEVEMENTS: 'db_achievements',
};

function genId(prefix = 'id'): string { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
function todayISO() { return new Date().toISOString().split('T')[0]; }

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
async function setJSON<T>(key: string, value: T) { await AsyncStorage.setItem(key, JSON.stringify(value)); }

// Dashboard
export async function getDashboard(date: string) {
  const pillsByDate = await getJSON<Record<string, PillTracking>>(K.PILLS, {});
  const drinksByDate = await getJSON<Record<string, DrinkTracking>>(K.DRINKS, {});
  const weightsByDate = await getJSON<Record<string, WeightEntry>>(K.WEIGHTS, {});
  const goals = await getJSON<WeightGoal[]>(K.GOALS, []);
  const active_goal = goals.find(g => g.is_active) || null;
  return {
    date,
    pills: pillsByDate[date] || null,
    drinks: drinksByDate[date] || null,
    weight: weightsByDate[date] || null,
    active_goal,
  };
}

// Pills
export async function updatePills(date: string, updates: Partial<PillTracking>) {
  const pillsByDate = await getJSON<Record<string, PillTracking>>(K.PILLS, {});
  const existing = pillsByDate[date] || { id: genId('pill'), date, morning_taken: false, evening_taken: false };
  const next = { ...existing, ...updates } as PillTracking;
  pillsByDate[date] = next;
  await setJSON(K.PILLS, pillsByDate);
  return next;
}

// Drinks
export async function updateDrink(date: string, drink_type: keyof DrinksMap, count: number) {
  const drinksByDate = await getJSON<Record<string, DrinkTracking>>(K.DRINKS, {});
  const existing = drinksByDate[date] || { id: genId('drink'), date, drinks: { wasser:0, abnehmkaffee:0, ingwer_knoblauch_tee:0, wasserkur:0, kaffee:0 } };
  existing.drinks[drink_type] = Math.max(0, count);
  drinksByDate[date] = existing;
  await setJSON(K.DRINKS, drinksByDate);
  return existing;
}

// Weight
export async function addWeight(date: string, weight: number) {
  const weightsByDate = await getJSON<Record<string, WeightEntry>>(K.WEIGHTS, {});
  const entry: WeightEntry = { id: genId('weight'), date, weight };
  weightsByDate[date] = entry;
  await setJSON(K.WEIGHTS, weightsByDate);
  return entry;
}

export async function getWeightRange(startISO: string, endISO: string) {
  const weightsByDate = await getJSON<Record<string, WeightEntry>>(K.WEIGHTS, {});
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  return Object.values(weightsByDate)
    .filter(w => {
      const t = new Date(w.date).getTime();
      return t >= start && t <= end;
    })
    .sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getWeightProgress(days: number) {
  const end = new Date(todayISO());
  const start = new Date(todayISO());
  start.setDate(end.getDate() - days + 1);
  const data = await getWeightRange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  const progress = data.map((e, idx) => ({ date: e.date, weight: e.weight, difference: idx === 0 ? 0 : parseFloat((e.weight - data[idx-1].weight).toFixed(1)) }));
  const summary = {
    total_days: days,
    entries_found: data.length,
    total_change: data.length > 1 ? parseFloat((data[data.length-1].weight - data[0].weight).toFixed(1)) : 0,
    start_weight: data[0]?.weight,
    current_weight: data[data.length-1]?.weight,
    average_daily_change: data.length > 1 ? parseFloat(((data[data.length-1].weight - data[0].weight) / (data.length-1)).toFixed(2)) : 0,
  };
  return { progress, summary };
}

// Goals
export async function getGoals() { return getJSON<WeightGoal[]>(K.GOALS, []); }
export async function createGoal(goal: Omit<WeightGoal,'id'|'is_active'> & Partial<Pick<WeightGoal,'is_active'>>) {
  const goals = await getGoals();
  const newGoal: WeightGoal = { id: genId('goal'), is_active: true, ...goal } as WeightGoal;
  // Deactivate others
  goals.forEach(g => g.is_active = false);
  goals.push(newGoal);
  await setJSON(K.GOALS, goals);
  return newGoal;
}

// Reminders
export async function getReminders() { return getJSON<Reminder[]>(K.REMINDERS, []); }
export async function createReminder(rem: Omit<Reminder,'id'>) {
  const list = await getReminders();
  const next = { id: genId('rem'), ...rem };
  list.push(next);
  await setJSON(K.REMINDERS, list);
  return next;
}
export async function toggleReminder(id: string) {
  const list = await getReminders();
  const idx = list.findIndex(r => r.id === id);
  if (idx >= 0) { list[idx].is_enabled = !list[idx].is_enabled; await setJSON(K.REMINDERS, list); }
  return list[idx];
}
export async function updateReminderTime(id: string, time: string) {
  const list = await getReminders();
  const idx = list.findIndex(r => r.id === id);
  if (idx >= 0) { list[idx].time = time; await setJSON(K.REMINDERS, list); }
  return list[idx];
}
export async function deleteReminder(id: string) {
  const list = await getReminders();
  const next = list.filter(r => r.id !== id);
  await setJSON(K.REMINDERS, next);
}

// Settings
export async function getAppSettings() {
  const def: AppSettings = { theme: 'pink', language: 'de', sound_enabled: true, vibration_enabled: true, analytics_enabled: false };
  return getJSON<AppSettings>(K.SETTINGS, def);
}
export async function updateAppSettings(patch: Partial<AppSettings>) {
  const cur = await getAppSettings();
  const next = { ...cur, ...patch };
  await setJSON(K.SETTINGS, next);
  return next;
}

// Achievements & Stats (local computation)
function baseAchievements(): Achievement[] {
  return [
    { id: 'a1', badge_type: 'first_weight', title: 'Erster Eintrag', description: 'Erstes Gewicht gespeichert', icon: 'checkmark-circle', color: '#FFD54F', xp_reward: 50, requirement_count: 1, current_count: 0, is_unlocked: false },
    { id: 'a2', badge_type: 'seven_days', title: '7 Tage', description: '7 Tage Gewichte gespeichert', icon: 'calendar', color: '#4FC3F7', xp_reward: 100, requirement_count: 7, current_count: 0, is_unlocked: false },
    { id: 'a3', badge_type: 'water_10', title: 'Wassermeister', description: '10 Gläser Wasser an einem Tag', icon: 'water', color: '#64B5F6', xp_reward: 120, requirement_count: 10, current_count: 0, is_unlocked: false },
  ];
}

export async function computeAchievementsAndStats() {
  const weightsByDate = await getJSON<Record<string, WeightEntry>>(K.WEIGHTS, {});
  const drinksByDate = await getJSON<Record<string, DrinkTracking>>(K.DRINKS, {});
  const pillsByDate = await getJSON<Record<string, PillTracking>>(K.PILLS, {});
  const ach = await getJSON<Achievement[]>(K.ACHIEVEMENTS, baseAchievements());

  const dates = Object.keys(weightsByDate).sort();
  const weightEntriesTotal = dates.length;

  // Update achievement progress
  ach.forEach(a => {
    if (a.badge_type === 'first_weight') {
      a.current_count = weightEntriesTotal > 0 ? 1 : 0;
      a.is_unlocked = a.current_count >= a.requirement_count;
      if (a.is_unlocked && !a.unlocked_at) a.unlocked_at = new Date().toISOString();
    }
    if (a.badge_type === 'seven_days') {
      a.current_count = Math.min(7, weightEntriesTotal);
      a.is_unlocked = a.current_count >= a.requirement_count;
      if (a.is_unlocked && !a.unlocked_at) a.unlocked_at = new Date().toISOString();
    }
    if (a.badge_type === 'water_10') {
      const today = drinksByDate[todayISO()];
      const glasses = today?.drinks?.wasser || 0;
      a.current_count = glasses;
      a.is_unlocked = glasses >= a.requirement_count;
      if (a.is_unlocked && !a.unlocked_at) a.unlocked_at = new Date().toISOString();
    }
  });

  const total_xp = ach.filter(a => a.is_unlocked).reduce((sum, a) => sum + a.xp_reward, 0);
  const current_level = Math.max(1, Math.floor(total_xp / 500) + 1);

  // Simple streak: consecutive days with any weight entry
  let streak = 0;
  const now = new Date(todayISO());
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (weightsByDate[iso]) streak++; else break;
  }

  const stats: UserStats = {
    id: 'user_stats',
    total_xp,
    current_level,
    current_streak_days: streak,
    longest_streak: streak,
    pills_taken_total: Object.values(pillsByDate).reduce((s, p)=> s + (p.morning_taken?1:0) + (p.evening_taken?1:0), 0),
    water_goals_achieved: 0,
    weight_entries_total: weightEntriesTotal,
    perfect_days: 0,
  };

  await setJSON(K.ACHIEVEMENTS, ach);
  await setJSON(K.USER_STATS, stats);
  return { achievements: ach, stats };
}

export async function getAchievements() { const a = await getJSON<Achievement[]>(K.ACHIEVEMENTS, baseAchievements()); return a; }
export async function getUserStats() { const s = await getJSON<UserStats>(K.USER_STATS, { id:'user_stats', total_xp:0, current_level:1, current_streak_days:0, longest_streak:0, pills_taken_total:0, water_goals_achieved:0, weight_entries_total:0, perfect_days:0 }); return s; }

// Saved messages & Chat (offline)
export type SavedChatMessage = { id: string; original_message: string; ai_response: string; category: string; title: string; tags: string[]; created_at: string };
export async function getSavedMessages(category?: string) {
  const list = await getJSON<SavedChatMessage[]>(K.SAVED_MSGS, []);
  return category && category !== 'all' ? list.filter(x => x.category === category) : list;
}
export async function saveMessage(item: Omit<SavedChatMessage,'id'|'created_at'>) {
  const list = await getJSON<SavedChatMessage[]>(K.SAVED_MSGS, []);
  const entry: SavedChatMessage = { id: genId('msg'), created_at: new Date().toISOString(), ...item };
  list.push(entry);
  await setJSON(K.SAVED_MSGS, list);
  return entry;
}
export async function deleteSavedMessageLocal(id: string) {
  const list = await getJSON<SavedChatMessage[]>(K.SAVED_MSGS, []);
  const next = list.filter(x => x.id !== id);
  await setJSON(K.SAVED_MSGS, next);
}

export async function sendChat(message: string): Promise<{ response: string }> {
  // Offline simple responder
  const lower = message.toLowerCase();
  if (lower.includes('wasser') || lower.includes('trinken')) return { response: 'Trinke heute regelmäßig kleine Mengen Wasser. Ziel: 8–10 Gläser, verteile es über den Tag.' };
  if (lower.includes('rezepte') || lower.includes('rezept')) return { response: 'Leichtes Rezept: Quark mit Beeren und Nüssen. Viel Protein, wenig Zucker.' };
  if (lower.includes('gewicht') || lower.includes('abnehmen')) return { response: 'Achte auf ein moderates Kaloriendefizit und ausreichend Protein. 8000 Schritte täglich sind ein guter Start.' };
  return { response: 'Danke für deine Nachricht! Ich unterstütze dich mit Tipps zu Ernährung, Bewegung und Motivation. Stelle mir gerne eine konkrete Frage.' };
}

// Utilities
export function formatDateDisplay(dateISO: string) {
  const d = new Date(dateISO);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth()+1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}
export function parseGermanDate(input: string): string | null {
  // Accept dd.mm.yyyy or dd.mm.yy
  const m = input.trim().match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1],10), mm = parseInt(m[2],10), yy = parseInt(m[3],10);
  const fullYear = yy < 100 ? (2000 + yy) : yy;
  const d = new Date(fullYear, mm-1, dd);
  if (d.getFullYear() !== fullYear || d.getMonth() !== mm-1 || d.getDate() !== dd) return null;
  return d.toISOString().split('T')[0];
}