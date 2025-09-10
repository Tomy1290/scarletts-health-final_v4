const BASE_URL = (process.env.EXPO_BACKEND_URL as string) || (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: (date: string) => request(`/api/dashboard/${date}`),

  // Pills
  updatePills: (date: string, body: any) => request(`/api/pills/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),

  // Drinks
  updateDrink: (date: string, body: any) => request(`/api/drinks/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),

  // Weight
  addWeight: (body: any) => request('/api/weight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  getWeightRange: (start: string, end: string) => request(`/api/weight/range/${start}/${end}`),
  getWeightProgress: (days: number) => request(`/api/weight-progress/${days}`),

  // Goals
  getGoals: () => request('/api/weight-goals'),
  createGoal: (body: any) => request('/api/weight-goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),

  // Reminders
  getReminders: () => request('/api/reminders'),
  createReminder: (body: any) => request('/api/reminders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  toggleReminder: (id: string, is_enabled: boolean) => request(`/api/reminders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_enabled }),
  }),
  deleteReminder: (id: string) => request(`/api/reminders/${id}`, { method: 'DELETE' }),

  // Settings
  getAppSettings: () => request('/api/settings/app'),
  updateAppSettings: (body: any) => request('/api/settings/app', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),

  // Achievements
  getAchievements: () => request('/api/achievements'),
  getUserStats: () => request('/api/user-stats'),

  // Chat
  sendChat: (body: any) => request('/api/health-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  getSavedMessages: () => request('/api/saved-messages'),
  saveMessage: (body: any) => request('/api/saved-messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  deleteSavedMessage: (id: string) => request(`/api/saved-messages/${id}`, { method: 'DELETE' }),
};