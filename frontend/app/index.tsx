import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-gifted-charts';
import { Calendar } from 'react-native-calendars';

const BACKEND_URL = (process.env.EXPO_BACKEND_URL as string) || (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 350;
const isMediumScreen = width >= 350 && width < 400;
const isLargeScreen = width >= 400;

// Dynamic spacing based on screen size
const getResponsiveValue = (small: number, medium: number, large: number) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

// Responsive padding
const SCREEN_PADDING = getResponsiveValue(12, 16, 20);
const CARD_PADDING = getResponsiveValue(12, 16, 18);
const SECTION_MARGIN = getResponsiveValue(12, 16, 20);

// Color Palette - Rosa/Pink Theme
const colors = {
  primary: '#FF69B4',        // Hot Pink
  secondary: '#FFB6C1',      // Light Pink
  accent: '#FFC0CB',         // Pink
  dark: '#C73E5A',           // Dark Pink
  background: '#1A0B14',     // Very dark pink/burgundy
  surface: '#2D1A24',        // Dark pink surface
  text: '#FFFFFF',
  textSecondary: '#E1B3C3',
  success: '#98FB98',        // Light Green
  warning: '#FFD700',        // Gold
  error: '#FF6B6B',          // Light Red
};

interface PillTracking {
  id: string;
  date: string;
  morning_taken: boolean;
  evening_taken: boolean;
}

interface DrinkTracking {
  id: string;
  date: string;
  drinks: {
    wasser: number;
    abnehmkaffee: number;
    ingwer_knoblauch_tee: number;
    wasserkur: number;
    kaffee: number;
  };
}

interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

interface WeightGoal {
  id: string;
  goal_type: 'percentage' | 'fixed_weight';
  start_weight: number;
  target_weight?: number;
  target_percentage?: number;
  start_date: string;
  target_date: string;
  is_active: boolean;
}

interface DashboardData {
  date: string;
  pills: PillTracking | null;
  drinks: DrinkTracking | null;
  weight: WeightEntry | null;
  active_goal: WeightGoal | null;
}

interface ChatMessage {
  message: string;
  is_user: boolean;
  timestamp: string;
}

interface SavedChatMessage {
  id: string;
  original_message: string;
  ai_response: string;
  category: string;
  title: string;
  tags: string[];
  created_at: string;
}

interface WeightProgress {
  date: string;
  weight: number;
  difference?: number;
}

interface WeightProgressData {
  progress: WeightProgress[];
  summary: {
    total_days: number;
    entries_found: number;
    total_change: number;
    start_weight?: number;
    current_weight?: number;
    average_daily_change: number;
  };
}

interface WaterIntakeStatus {
  total_ml: number;
  daily_goal_ml: number;
  remaining_ml: number;
  progress_percentage: number;
  glasses_consumed: number;
  ml_per_glass: number;
  glasses_needed: number;
}

interface UserProfile {
  id: string;
  height?: number;
  age?: number;
  gender?: string;
  activity_level?: string;
  glass_size: number;
}

interface Achievement {
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
}

interface UserStats {
  id: string;
  total_xp: number;
  current_level: number;
  current_streak_days: number;
  longest_streak: number;
  pills_taken_total: number;
  water_goals_achieved: number;
  weight_entries_total: number;
  perfect_days: number;
}

interface NotificationSettings {
  morning_pills_time: string;
  evening_pills_time: string;
  water_reminder_times: string[];
  weight_reminder_time: string;
  motivation_reminder_time: string;
  is_enabled: boolean;
}

interface AppSettings {
  theme: string;
  language: string;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  analytics_enabled: boolean;
}

// Theme configurations
const themes = {
  pink: {
    primary: '#FF69B4',
    secondary: '#FFB6C1',
    accent: '#FFC0CB',
    dark: '#C73E5A',
    background: '#1A0B14',
    surface: '#2D1A24',
    text: '#FFFFFF',
    textSecondary: '#E1B3C3',
    success: '#98FB98',
    warning: '#FFD700',
    error: '#FF6B6B',
  },
  blue: {
    primary: '#2196F3',
    secondary: '#64B5F6',
    accent: '#81D4FA',
    dark: '#1565C0',
    background: '#0D1421',
    surface: '#1A2332',
    text: '#FFFFFF',
    textSecondary: '#B3D9FF',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
  },
  green: {
    primary: '#4CAF50',
    secondary: '#81C784',
    accent: '#A5D6A7',
    dark: '#2E7D32',
    background: '#0F1B0F',
    surface: '#1B2E1B',
    text: '#FFFFFF',
    textSecondary: '#C8E6C9',
    success: '#66BB6A',
    warning: '#FF9800',
    error: '#F44336',
  },
};

const CHAT_CATEGORIES = {
  rezepte: { label: 'Rezepte', icon: 'restaurant', color: colors.primary },
  gesundheitstipps: { label: 'Gesundheitstipps', icon: 'medical', color: colors.secondary },
  motivation: { label: 'Motivation', icon: 'trophy', color: colors.accent },
  fitness: { label: 'Fitness', icon: 'fitness', color: colors.warning },
  ernaehrung: { label: 'Ernährung', icon: 'nutrition', color: colors.success },
  allgemein: { label: 'Allgemein', icon: 'chatbubbles', color: colors.dark }
};

export default function ScarlettHealthDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Theme state
  const [currentTheme, setCurrentTheme] = useState('pink');
  const themeKeySafe = (currentTheme in themes ? currentTheme : 'pink') as keyof typeof themes;
  const colors = themes[themeKeySafe];

  // Modal states
  const [showWeightChart, setShowWeightChart] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showHealthChat, setShowHealthChat] = useState(false);
  const [showSavedMessages, setShowSavedMessages] = useState(false);
  const [showWeightProgress, setShowWeightProgress] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  // Achievement & Stats states
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [newAchievementUnlocked, setNewAchievementUnlocked] = useState<Achievement | null>(null);

  // Settings states
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // Weight input modal state
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  // Weight goals state
  const [showWeightGoals, setShowWeightGoals] = useState(false);
  const [weightGoals, setWeightGoals] = useState<WeightGoal[]>([]);
  const [activeWeightGoal, setActiveWeightGoal] = useState<WeightGoal | null>(null);
  const [goalTargetWeight, setGoalTargetWeight] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');

  // Weight chart data
  const [weightChartData, setWeightChartData] = useState<any[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'custom'>('week');

  // Health Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Saved messages state
  const [savedMessages, setSavedMessages] = useState<SavedChatMessage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Weight progress state
  const [weightProgressData, setWeightProgressData] = useState<WeightProgressData | null>(null);
  const [progressDays, setProgressDays] = useState(7);

  // Water intake state
  const [waterIntakeStatus, setWaterIntakeStatus] = useState<WaterIntakeStatus | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showWaterSettings, setShowWaterSettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Save chat message modal
  const [showSaveChatModal, setShowSaveChatModal] = useState(false);
  const [messageToSave, setMessageToSave] = useState<{original: string, response: string} | null>(null);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveCategory, setSaveCategory] = useState('allgemein');
  const [saveTags, setSaveTags] = useState('');

  // Reminders state
  const [showReminders, setShowReminders] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [newReminderType, setNewReminderType] = useState('pills_morning');
  const [newReminderTime, setNewReminderTime] = useState('08:00');

  // Fetch functions
  const fetchAchievements = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/achievements`);
      if (response.ok) {
        const data = await response.json();
        setAchievements(data);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/user-stats`);
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchAppSettings = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/settings/app`);
      if (response.ok) {
        const data = await response.json();
        setAppSettings(data);
        setCurrentTheme(data.theme || 'pink');
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    }
  };

  const updateTheme = async (newTheme: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/settings/app`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
      
      if (response.ok) {
        setCurrentTheme(newTheme);
        Alert.alert('Erfolg', 'Theme wurde geändert!');
      }
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  const fetchDashboardData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/dashboard/${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        console.error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      if (refresh) setRefreshing(false);
    }
  };

  const fetchWeightChartData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (chartPeriod === 'week') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (chartPeriod === 'month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else {
        startDate.setMonth(endDate.getMonth() - 3); // Default 3 months for custom
      }

      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/weight/range/${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}`
      );

      if (response.ok) {
        const data: WeightEntry[] = await response.json();
        const chartData = data.map((entry, index) => ({
          value: entry.weight,
          label: new Date(entry.date).getDate().toString(),
          dataPointText: entry.weight.toString(),
        }));
        setWeightChartData(chartData);
      }
    } catch (error) {
      console.error('Error fetching weight chart data:', error);
    }
  };

  const fetchWeightProgress = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/weight-progress/${progressDays}`);
      if (response.ok) {
        const data: WeightProgressData = await response.json();
        setWeightProgressData(data);
      }
    } catch (error) {
      console.error('Error fetching weight progress:', error);
    }
  };

  const fetchSavedMessages = async () => {
    try {
      let url = `${EXPO_PUBLIC_BACKEND_URL}/api/saved-messages`;
      if (selectedCategory !== 'all') {
        url += `?category=${selectedCategory}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data: SavedChatMessage[] = await response.json();
        setSavedMessages(data);
      }
    } catch (error) {
      console.error('Error fetching saved messages:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    setChatLoading(true);
    const userMessage = chatInput;
    setChatInput('');

    // Add user message to UI immediately
    const newUserMessage: ChatMessage = {
      message: userMessage,
      is_user: true,
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/health-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: chatSessionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatSessionId(data.session_id);
        
        const aiMessage: ChatMessage = {
          message: data.response,
          is_user: false,
          timestamp: new Date().toISOString(),
        };
        
        setChatMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      Alert.alert('Fehler', 'Nachricht konnte nicht gesendet werden');
    } finally {
      setChatLoading(false);
    }
  };

  const saveChatMessage = async () => {
    if (!messageToSave || !saveTitle.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie einen Titel ein');
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/saved-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_message: messageToSave.original,
          ai_response: messageToSave.response,
          category: saveCategory,
          title: saveTitle,
          tags: saveTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        }),
      });

      if (response.ok) {
        Alert.alert('Erfolg', 'Nachricht erfolgreich gespeichert');
        setShowSaveChatModal(false);
        setSaveTitle('');
        setSaveTags('');
        setMessageToSave(null);
      }
    } catch (error) {
      console.error('Error saving chat message:', error);
      Alert.alert('Fehler', 'Fehler beim Speichern der Nachricht');
    }
  };

  const promptSaveMessage = (original: string, response: string) => {
    setMessageToSave({ original, response });
    setShowSaveChatModal(true);
  };

  // Reminders functions
  const fetchReminders = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/reminders`);
      if (response.ok) {
        const remindersData = await response.json();
        setReminders(remindersData);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const createReminder = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reminder_type: newReminderType,
          time: newReminderTime,
          is_enabled: true,
        }),
      });

      if (response.ok) {
        fetchReminders();
        setNewReminderType('pills_morning');
        setNewReminderTime('08:00');
        if (Platform.OS !== 'web') {
          Alert.alert('Erfolg', 'Erinnerung erfolgreich erstellt');
        }
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Fehler', 'Fehler beim Erstellen der Erinnerung');
      }
    }
  };

  const toggleReminder = async (reminderId: string, isEnabled: boolean) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/reminders/${reminderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_enabled: !isEnabled,
        }),
      });

      if (response.ok) {
        fetchReminders();
      }
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/reminders/${reminderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchReminders();
        if (Platform.OS !== 'web') {
          Alert.alert('Erfolg', 'Erinnerung gelöscht');
        }
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAchievements();
    fetchUserStats();
    fetchWeightGoals();
    fetchReminders();
    fetchAppSettings();
  }, [selectedDate]);

  useEffect(() => {
    if (showWeightChart) {
      fetchWeightChartData();
    }
  }, [showWeightChart, chartPeriod]);

  useEffect(() => {
    if (showSavedMessages) {
      fetchSavedMessages();
    }
  }, [showSavedMessages, selectedCategory]);

  useEffect(() => {
    if (showWeightProgress) {
      fetchWeightProgress();
    }
  }, [showWeightProgress, progressDays]);

  const updatePillTracking = async (time: 'morning' | 'evening', taken: boolean) => {
    try {
      const updateData = time === 'morning' 
        ? { morning_taken: taken }
        : { evening_taken: taken };
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/pills/${selectedDate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        fetchDashboardData();
        Alert.alert('Erfolg', `${time === 'morning' ? 'Morgen' : 'Abend'}-Tablette ${taken ? 'eingenommen' : 'zurückgesetzt'}`);
      }
    } catch (error) {
      console.error('Error updating pill tracking:', error);
      Alert.alert('Fehler', 'Fehler beim Aktualisieren der Tabletten-Tracking');
    }
  };

  const updateSpecialDrink = async (drinkType: string) => {
    try {
      const currentValue = dashboardData?.drinks?.drinks[drinkType as keyof typeof dashboardData.drinks.drinks] || 0;
      const newValue = currentValue > 0 ? 0 : 1; // Toggle between 0 and 1
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/drinks/${selectedDate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          drink_type: drinkType,
          count: newValue,
        }),
      });

      if (response.ok) {
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating special drink:', error);
      Alert.alert('Fehler', 'Fehler beim Aktualisieren des Getränks');
    }
  };
  const updateDrinkCount = async (drinkType: string, increment: boolean) => {
    try {
      const currentCount = dashboardData?.drinks?.drinks[drinkType as keyof typeof dashboardData.drinks.drinks] || 0;
      const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/drinks/${selectedDate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          drink_type: drinkType,
          count: newCount,
        }),
      });

      if (response.ok) {
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating drink count:', error);
      Alert.alert('Fehler', 'Fehler beim Aktualisieren der Getränke-Zählung');
    }
  };

  const deleteSavedMessage = async (messageId: string) => {
    Alert.alert(
      'Nachricht löschen',
      'Möchten Sie diese gespeicherte Nachricht wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/saved-messages/${messageId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Erfolg', 'Nachricht wurde gelöscht');
                fetchSavedMessages(); // Refresh the list
              } else {
                Alert.alert('Fehler', 'Fehler beim Löschen der Nachricht');
              }
            } catch (error) {
              console.error('Error deleting saved message:', error);
              Alert.alert('Fehler', 'Fehler beim Löschen der Nachricht');
            }
          }
        }
      ]
    );
  };

  const addWeightEntry = () => {
    // Set current weight as default value
    setWeightInput(dashboardData?.weight?.weight.toString() || '');
    setShowWeightInput(true);
  };

  const submitWeightEntry = async () => {
    if (weightInput && !isNaN(parseFloat(weightInput))) {
      try {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/weight`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: selectedDate,
            weight: parseFloat(weightInput),
          }),
        });

        if (response.ok) {
          fetchDashboardData();
          setShowWeightInput(false);
          setWeightInput('');
          if (Platform.OS !== 'web') {
            Alert.alert('Erfolg', 'Gewicht erfolgreich gespeichert');
          }
        }
      } catch (error) {
        console.error('Error adding weight entry:', error);
        if (Platform.OS !== 'web') {
          Alert.alert('Fehler', 'Fehler beim Speichern des Gewichts');
        }
      }
    } else {
      if (Platform.OS !== 'web') {
        Alert.alert('Fehler', 'Bitte geben Sie eine gültige Zahl ein');
      }
    }
  };

  // Weight goals functions
  const fetchWeightGoals = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/weight-goals`);
      if (response.ok) {
        const goals = await response.json();
        setWeightGoals(goals);
        
        const activeGoal = goals.find((goal: WeightGoal) => goal.is_active);
        setActiveWeightGoal(activeGoal || null);
      }
    } catch (error) {
      console.error('Error fetching weight goals:', error);
    }
  };

  const createWeightGoal = async () => {
    if (!goalTargetWeight || !goalTargetDate || !dashboardData?.weight) {
      if (Platform.OS !== 'web') {
        Alert.alert('Fehler', 'Bitte füllen Sie alle Felder aus und geben Sie zuerst ein Gewicht ein');
      }
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/weight-goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal_type: 'fixed_weight',
          start_weight: dashboardData.weight.weight,
          target_weight: parseFloat(goalTargetWeight),
          start_date: selectedDate,
          target_date: goalTargetDate,
        }),
      });

      if (response.ok) {
        fetchWeightGoals();
        setGoalTargetWeight('');
        setGoalTargetDate('');
        if (Platform.OS !== 'web') {
          Alert.alert('Erfolg', 'Gewichtsziel erfolgreich erstellt');
        }
      }
    } catch (error) {
      console.error('Error creating weight goal:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Fehler', 'Fehler beim Erstellen des Gewichtsziels');
      }
    }
  };

  // Date navigation functions
  const navigateToNextDay = () => {
    const currentDate = new Date(selectedDate);
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);
    const todayStr = new Date().toISOString().split('T')[0];
    const nextStr = nextDate.toISOString().split('T')[0];
    if (nextStr <= todayStr) {
      setSelectedDate(nextStr);
    }
  };

  const navigateToPreviousDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const navigateToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const DrinkCounter = ({ title, drinkType, icon, color }: {
    title: string;
    drinkType: string;
    icon: string;
    color: string;
  }) => {
    const count = dashboardData?.drinks?.drinks[drinkType as keyof typeof dashboardData.drinks.drinks] || 0;
    
    return (
      <View style={[styles.drinkCard, { borderLeftColor: color }]}>
        <View style={styles.drinkHeader}>
          <Ionicons name={icon as any} size={24} color={color} />
          <Text style={styles.drinkTitle}>{title}</Text>
        </View>
        <View style={styles.drinkControls}>
          <TouchableOpacity
            style={[styles.drinkButton, { backgroundColor: color + '30' }]}
            onPress={() => updateDrinkCount(drinkType, false)}
          >
            <Ionicons name="remove" size={20} color={color} />
          </TouchableOpacity>
          <Text style={styles.drinkCount}>{count}</Text>
          <TouchableOpacity
            style={[styles.drinkButton, { backgroundColor: color + '30' }]}
            onPress={() => updateDrinkCount(drinkType, true)}
          >
            <Ionicons name="add" size={20} color={color} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const WeightProgressItem = ({ item, index }: { item: WeightProgress, index: number }) => {
    const dayName = new Date(item.date).toLocaleDateString('de-DE', { weekday: 'short' });
    const dateDisplay = new Date(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    
    return (
      <View style={styles.progressItem}>
        <View style={styles.progressDateColumn}>
          <Text style={styles.progressDay}>{dayName}</Text>
          <Text style={styles.progressDate}>{dateDisplay}</Text>
        </View>
        
        <View style={styles.progressWeightColumn}>
          <Text style={styles.progressWeight}>{item.weight} kg</Text>
        </View>
        
        <View style={styles.progressDifferenceColumn}>
          {item.difference !== undefined && item.difference !== null && (
            <Text style={[
              styles.progressDifference,
              { color: item.difference > 0 ? colors.error : item.difference < 0 ? colors.success : colors.textSecondary }
            ]}>
              {item.difference > 0 ? '+' : ''}{item.difference} kg
            </Text>
          )}
        </View>
      </View>
    );
  };

  const SavedMessageItem = ({ item }: { item: SavedChatMessage }) => {
    const categoryInfo = CHAT_CATEGORIES[item.category as keyof typeof CHAT_CATEGORIES] || CHAT_CATEGORIES.allgemein;
    
    return (
      <View style={styles.savedMessageCard}>
        <View style={styles.savedMessageHeader}>
          <View style={styles.savedMessageCategory}>
            <Ionicons name={categoryInfo.icon as any} size={16} color={categoryInfo.color} />
            <Text style={[styles.savedMessageCategoryText, { color: categoryInfo.color }]}>
              {categoryInfo.label}
            </Text>
          </View>
          <View style={styles.savedMessageActions}>
            <Text style={styles.savedMessageDate}>
              {new Date(item.created_at).toLocaleDateString('de-DE')}
            </Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteSavedMessage(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.savedMessageTitle}>{item.title}</Text>
        
        <View style={styles.savedMessageContent}>
          <Text style={styles.savedMessageQuestion}>Frage: {item.original_message}</Text>
          <Text style={styles.savedMessageAnswer}>Antwort: {item.ai_response}</Text>
        </View>
        
        {item.tags.length > 0 && (
          <View style={styles.savedMessageTags}>
            {item.tags.map((tag, index) => (
              <View key={index} style={styles.savedMessageTag}>
                <Text style={styles.savedMessageTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Lädt...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>💖 Scarletts Gesundheitstracking</Text>
          </View>
          {userStats && (
            <TouchableOpacity style={styles.levelContainer} onPress={() => setShowAchievements(true)}>
              <Text style={styles.levelText}>Level {userStats.current_level}</Text>
              <Text style={styles.xpText}>{userStats.total_xp} XP</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerDateContainer}>
          <TouchableOpacity style={styles.dateNavButton} onPress={navigateToPreviousDay}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToToday} style={styles.dateTextContainer}>
            <Text style={styles.headerDate}>
              {new Date(selectedDate).toLocaleDateString('de-DE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateNavButton} onPress={navigateToNextDay}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} />
        }
      >
        {/* Pills Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💊 Tabletten</Text>
          <View style={styles.pillsContainer}>
            <TouchableOpacity
              style={[
                styles.pillCard,
                dashboardData?.pills?.morning_taken && styles.pillCardTaken
              ]}
              onPress={() => updatePillTracking('morning', !dashboardData?.pills?.morning_taken)}
            >
              <Ionicons 
                name={dashboardData?.pills?.morning_taken ? "checkmark-circle" : "ellipse-outline"} 
                size={32} 
                color={dashboardData?.pills?.morning_taken ? colors.success : colors.textSecondary} 
              />
              <Text style={styles.pillText}>Morgens</Text>
              <Text style={styles.pillSubText}>
                {dashboardData?.pills?.morning_taken ? "Eingenommen" : "Ausstehend"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pillCard,
                dashboardData?.pills?.evening_taken && styles.pillCardTaken
              ]}
              onPress={() => updatePillTracking('evening', !dashboardData?.pills?.evening_taken)}
            >
              <Ionicons 
                name={dashboardData?.pills?.evening_taken ? "checkmark-circle" : "ellipse-outline"} 
                size={32} 
                color={dashboardData?.pills?.evening_taken ? colors.success : colors.textSecondary} 
              />
              <Text style={styles.pillText}>Abends</Text>
              <Text style={styles.pillSubText}>
                {dashboardData?.pills?.evening_taken ? "Eingenommen" : "Ausstehend"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Drinks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥤 Getränke</Text>
          <View style={styles.drinksGrid}>
            {/* Wasser and Kaffee as counters */}
            <DrinkCounter
              title="Wasser"
              drinkType="wasser"
              icon="water"
              color={colors.primary}
            />
            
            {/* Enhanced Water Info */}
            {waterIntakeStatus && (
              <View style={styles.waterInfoCard}>
                <View style={styles.waterInfoHeader}>
                  <Ionicons name="water" size={20} color={colors.primary} />
                  <Text style={styles.waterInfoTitle}>Wasseraufnahme heute</Text>
                  <TouchableOpacity onPress={() => setShowWaterSettings(true)}>
                    <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.waterInfoStatus}>
                  {waterIntakeStatus.total_ml}ml / {waterIntakeStatus.daily_goal_ml}ml ({waterIntakeStatus.progress_percentage}%)
                </Text>
                {waterIntakeStatus.remaining_ml > 0 && (
                  <Text style={styles.waterInfoRemaining}>
                    Noch {waterIntakeStatus.remaining_ml}ml ({waterIntakeStatus.glasses_needed} Gläser) benötigt
                  </Text>
                )}
              </View>
            )}
            <DrinkCounter
              title="Kaffee"
              drinkType="kaffee"
              icon="cafe"
              color={colors.dark}
            />
            
            {/* Special drinks as clickable toggles */}
            <View style={styles.specialDrinksContainer}>
              <TouchableOpacity
                style={[
                  styles.specialDrinkCard,
                  (dashboardData?.drinks?.drinks.abnehmkaffee || 0) > 0 && styles.specialDrinkCardTaken
                ]}
                onPress={() => updateSpecialDrink('abnehmkaffee')}
              >
                <Ionicons 
                  name={(dashboardData?.drinks?.drinks.abnehmkaffee || 0) > 0 ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={(dashboardData?.drinks?.drinks.abnehmkaffee || 0) > 0 ? colors.success : colors.textSecondary} 
                />
                <Text style={styles.specialDrinkText}>☕ Abnehmkaffee</Text>
                <Text style={styles.specialDrinkSubText}>
                  {(dashboardData?.drinks?.drinks.abnehmkaffee || 0) > 0 ? "Getrunken" : "Ausstehend"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.specialDrinkCard,
                  (dashboardData?.drinks?.drinks.ingwer_knoblauch_tee || 0) > 0 && styles.specialDrinkCardTaken
                ]}
                onPress={() => updateSpecialDrink('ingwer_knoblauch_tee')}
              >
                <Ionicons 
                  name={(dashboardData?.drinks?.drinks.ingwer_knoblauch_tee || 0) > 0 ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={(dashboardData?.drinks?.drinks.ingwer_knoblauch_tee || 0) > 0 ? colors.success : colors.textSecondary} 
                />
                <Text style={styles.specialDrinkText}>🫖 Ingwer-Knoblauch-Tee</Text>
                <Text style={styles.specialDrinkSubText}>
                  {(dashboardData?.drinks?.drinks.ingwer_knoblauch_tee || 0) > 0 ? "Getrunken" : "Ausstehend"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.specialDrinkCard,
                  (dashboardData?.drinks?.drinks.wasserkur || 0) > 0 && styles.specialDrinkCardTaken
                ]}
                onPress={() => updateSpecialDrink('wasserkur')}
              >
                <Ionicons 
                  name={(dashboardData?.drinks?.drinks.wasserkur || 0) > 0 ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={(dashboardData?.drinks?.drinks.wasserkur || 0) > 0 ? colors.success : colors.textSecondary} 
                />
                <Text style={styles.specialDrinkText}>💧 Wasserkur</Text>
                <Text style={styles.specialDrinkSubText}>
                  {(dashboardData?.drinks?.drinks.wasserkur || 0) > 0 ? "Durchgeführt" : "Ausstehend"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Weight Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚖️ Gewicht</Text>
          <TouchableOpacity style={styles.weightCard} onPress={addWeightEntry}>
            <View style={styles.weightContent}>
              <Ionicons name="scale" size={32} color={colors.primary} />
              <View style={styles.weightInfo}>
                {dashboardData?.weight ? (
                  <>
                    <Text style={styles.weightValue}>{dashboardData.weight.weight} kg</Text>
                    <Text style={styles.weightDate}>Heute eingetragen</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.weightValue}>-- kg</Text>
                    <Text style={styles.weightDate}>Tippen zum Eingeben</Text>
                  </>
                )}
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Achievement Preview Section - Only next 3 achievable */}
        {achievements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nächste Erfolge</Text>
              <TouchableOpacity onPress={() => setShowAchievements(true)}>
                <Text style={styles.seeAllText}>Alle anzeigen</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementPreview}>
              {achievements
                .filter(ach => !ach.is_unlocked)
                .sort((a, b) => (b.current_count / b.requirement_count) - (a.current_count / a.requirement_count))
                .slice(0, 3)
                .map((achievement) => (
                  <TouchableOpacity 
                    key={achievement.id} 
                    style={styles.achievementPreviewCard}
                    onPress={() => setShowAchievements(true)}
                  >
                    <Ionicons 
                      name={achievement.icon as any} 
                      size={24} 
                      color={achievement.color} 
                    />
                    <Text style={styles.achievementPreviewTitle}>{achievement.title}</Text>
                    <View style={styles.miniProgressContainer}>
                      <View style={[styles.miniProgressBar, { backgroundColor: colors.surface }]}>
                        <View 
                          style={[
                            styles.miniProgressFill,
                            { 
                              width: `${(achievement.current_count / achievement.requirement_count) * 100}%`,
                              backgroundColor: achievement.color
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.achievementPreviewProgress}>
                        {achievement.current_count}/{achievement.requirement_count}
                      </Text>
                    </View>
                    <Text style={styles.achievementPreviewXP}>+{achievement.xp_reward} XP</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}
        {dashboardData?.active_goal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Gewichtsziel</Text>
            <View style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Ionicons name="flag" size={24} color={colors.primary} />
                <Text style={styles.goalTitle}>Aktives Ziel</Text>
              </View>
              <View style={styles.goalDetails}>
                <Text style={styles.goalText}>
                  Start: {dashboardData.active_goal.start_weight} kg
                </Text>
                {dashboardData.active_goal.goal_type === 'percentage' ? (
                  <Text style={styles.goalText}>
                    Ziel: -{dashboardData.active_goal.target_percentage}%
                  </Text>
                ) : (
                  <Text style={styles.goalText}>
                    Ziel: {dashboardData.active_goal.target_weight} kg
                  </Text>
                )}
                <Text style={styles.goalText}>
                  Bis: {new Date(dashboardData.active_goal.target_date).toLocaleDateString('de-DE')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navigationSection}>
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowWeightChart(true)}
          >
            <Ionicons name="analytics" size={24} color={colors.primary} />
            <Text style={styles.navButtonText}>Gewichtsverlauf</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowWeightProgress(true)}
          >
            <Ionicons name="trending-down" size={24} color={colors.success} />
            <Text style={styles.navButtonText}>Gewichts-Differenzen</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowWeightGoals(true)}
          >
            <Ionicons name="flag" size={24} color={colors.secondary} />
            <Text style={styles.navButtonText}>Gewichtsziele</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowReminders(true)}
          >
            <Ionicons name="notifications" size={24} color={colors.accent} />
            <Text style={styles.navButtonText}>Erinnerungen</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowCalendar(true)}
          >
            <Ionicons name="calendar" size={24} color={colors.warning} />
            <Text style={styles.navButtonText}>Kalender</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowHealthChat(true)}
          >
            <Ionicons name="chatbubbles" size={24} color={colors.primary} />
            <Text style={styles.navButtonText}>Gesundheit-KI Gugi</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowSavedMessages(true)}
          >
            <Ionicons name="bookmark" size={24} color={colors.accent} />
            <Text style={styles.navButtonText}>Gespeicherte Tipps</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowAchievements(true)}
          >
            <Ionicons name="trophy" size={24} color={colors.warning} />
            <Text style={styles.navButtonText}>Erfolge & Level</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowSettings(true)}
          >
            <Ionicons name="settings" size={24} color={colors.textSecondary} />
            <Text style={styles.navButtonText}>Einstellungen</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
          <Text style={styles.footerCredit}>Created by Gugi 💖</Text>
        </View>
      </ScrollView>

      {/* Weight Progress Modal */}
      <Modal visible={showWeightProgress} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gewichts-Differenzen</Text>
            <TouchableOpacity onPress={() => setShowWeightProgress(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.progressDaysSelector}>
            <Text style={styles.progressDaysLabel}>Zeitraum:</Text>
            <View style={styles.progressDaysButtons}>
              {[7, 14, 30].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.progressDaysButton,
                    progressDays === days && styles.progressDaysButtonActive
                  ]}
                  onPress={() => setProgressDays(days)}
                >
                  <Text style={[
                    styles.progressDaysButtonText,
                    progressDays === days && styles.progressDaysButtonTextActive
                  ]}>
                    {days} Tage
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {weightProgressData && (
            <View style={styles.progressSummary}>
              <Text style={styles.progressSummaryTitle}>Zusammenfassung</Text>
              <View style={styles.progressSummaryRow}>
                <Text style={styles.progressSummaryLabel}>Einträge gefunden:</Text>
                <Text style={styles.progressSummaryValue}>{weightProgressData.summary.entries_found}/{weightProgressData.summary.total_days}</Text>
              </View>
              <View style={styles.progressSummaryRow}>
                <Text style={styles.progressSummaryLabel}>Gesamtveränderung:</Text>
                <Text style={[
                  styles.progressSummaryValue,
                  { color: weightProgressData.summary.total_change > 0 ? colors.error : weightProgressData.summary.total_change < 0 ? colors.success : colors.textSecondary }
                ]}>
                  {weightProgressData.summary.total_change > 0 ? '+' : ''}{weightProgressData.summary.total_change} kg
                </Text>
              </View>
              <View style={styles.progressSummaryRow}>
                <Text style={styles.progressSummaryLabel}>Ø täglich:</Text>
                <Text style={[
                  styles.progressSummaryValue,
                  { color: weightProgressData.summary.average_daily_change > 0 ? colors.error : weightProgressData.summary.average_daily_change < 0 ? colors.success : colors.textSecondary }
                ]}>
                  {weightProgressData.summary.average_daily_change > 0 ? '+' : ''}{weightProgressData.summary.average_daily_change} kg
                </Text>
              </View>
            </View>
          )}

          <ScrollView style={styles.progressList}>
            {weightProgressData ? (
              <>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressHeaderText}>Tag</Text>
                  <Text style={styles.progressHeaderText}>Gewicht</Text>
                  <Text style={styles.progressHeaderText}>Differenz</Text>
                </View>
                <FlatList
                  data={weightProgressData.progress}
                  renderItem={WeightProgressItem}
                  keyExtractor={(item) => item.date}
                  scrollEnabled={false}
                />
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Keine Gewichtsdaten verfügbar</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Weight Chart Modal */}
      <Modal visible={showWeightChart} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gewichtsverlauf</Text>
            <TouchableOpacity onPress={() => setShowWeightChart(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.chartPeriodSelector}>
            {(['week', 'month', 'custom'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  chartPeriod === period && styles.periodButtonActive
                ]}
                onPress={() => setChartPeriod(period)}
              >
                <Text style={[
                  styles.periodButtonText,
                  chartPeriod === period && styles.periodButtonTextActive
                ]}>
                  {period === 'week' ? 'Woche' : period === 'month' ? 'Monat' : 'Benutzerdefiniert'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.chartContainer}>
            {weightChartData.length > 0 ? (
              <LineChart
                data={weightChartData}
                width={width - 40}
                height={300}
                color={colors.primary}
                thickness={3}
                dataPointsColor={colors.secondary}
                dataPointsRadius={6}
                textColor={colors.text}
                textFontSize={12}
                yAxisTextStyle={{color: colors.text}}
                xAxisLabelTextStyle={{color: colors.text}}
                backgroundColor={colors.surface}
                showVerticalLines
                verticalLinesColor={colors.textSecondary + '30'}
                showHorizontalLines
                horizontalLinesColor={colors.textSecondary + '30'}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Keine Gewichtsdaten verfügbar</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Calendar Modal */}
      <Modal visible={showCalendar} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Kalender</Text>
            <TouchableOpacity onPress={() => setShowCalendar(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <Calendar
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setShowCalendar(false);
            }}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: colors.primary }
            }}
            theme={{
              backgroundColor: colors.background,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.text,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.text,
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.textSecondary,
              dotColor: colors.primary,
              selectedDotColor: colors.text,
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              indicatorColor: colors.primary,
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Saved Messages Modal */}
      <Modal visible={showSavedMessages} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gespeicherte Tipps</Text>
            <TouchableOpacity onPress={() => setShowSavedMessages(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal style={styles.categorySelector} showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'all' && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === 'all' && styles.categoryButtonTextActive
              ]}>Alle</Text>
            </TouchableOpacity>
            
            {Object.entries(CHAT_CATEGORIES).map(([key, category]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryButton,
                  selectedCategory === key && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(key)}
              >
                <Ionicons name={category.icon as any} size={16} color={category.color} />
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === key && styles.categoryButtonTextActive
                ]}>{category.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={savedMessages}
            renderItem={SavedMessageItem}
            keyExtractor={(item) => item.id}
            style={styles.savedMessagesList}
            ListEmptyComponent={
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Keine gespeicherten Nachrichten gefunden</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Health Chat Modal */}
      <Modal visible={showHealthChat} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🤖 Gesundheitsassistent Gugi</Text>
            <TouchableOpacity onPress={() => setShowHealthChat(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.chatContainer}>
            {chatMessages.length === 0 && (
              <View style={styles.chatWelcome}>
                <Text style={styles.chatWelcomeText}>
                  Hallo! Ich bin Gugi, dein KI-Gesundheitsassistent. 💖
                  {'\n\n'}Ich helfe dir gerne bei:
                  {'\n'}• Gesundheitstipps & Wellness
                  {'\n'}• Gesunde Rezepte & Ernährung
                  {'\n'}• Motivation für deine Ziele
                  {'\n'}• Fitness & Bewegungsempfehlungen
                  {'\n\n'}Wie kann ich dir heute helfen?
                </Text>
              </View>
            )}
            
            {chatMessages.map((msg, index) => (
              <View key={index}>
                <View
                  style={[
                    styles.chatMessage,
                    msg.is_user ? styles.userMessage : styles.aiMessage
                  ]}
                >
                  <Text style={styles.chatMessageText}>{msg.message}</Text>
                </View>
                
                {/* Save button for AI messages */}
                {!msg.is_user && index > 0 && (
                  <TouchableOpacity
                    style={styles.saveMessageButton}
                    onPress={() => promptSaveMessage(chatMessages[index-1].message, msg.message)}
                  >
                    <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
                    <Text style={styles.saveMessageButtonText}>Speichern</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            {chatLoading && (
              <View style={styles.aiMessage}>
                <Text style={styles.chatMessageText}>Gugi tippt...</Text>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Schreibe deine Nachricht..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={styles.chatSendButton}
              onPress={sendChatMessage}
              disabled={!chatInput.trim() || chatLoading}
            >
              <Ionicons 
                name="send" 
                size={24} 
                color={chatInput.trim() && !chatLoading ? colors.text : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Achievements Modal - Enhanced with Categories */}
      <Modal visible={showAchievements} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Erfolge & Level</Text>
            <TouchableOpacity onPress={() => setShowAchievements(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {userStats && (
            <View style={styles.statsContainer}>
              <View style={styles.levelCard}>
                <View style={styles.levelInfo}>
                  <Text style={styles.currentLevel}>Level {userStats.current_level}</Text>
                  <Text style={styles.currentXP}>{userStats.total_xp} XP</Text>
                </View>
                <View style={styles.levelStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{achievements.filter(a => a.is_unlocked).length}</Text>
                    <Text style={styles.statLabel}>Erfolge</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{userStats.current_streak_days}</Text>
                    <Text style={styles.statLabel}>Streak</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{userStats.perfect_days}</Text>
                    <Text style={styles.statLabel}>Perfekt</Text>
                  </View>
                </View>
                <View style={styles.xpProgressBar}>
                  <View 
                    style={[
                      styles.xpProgressFill,
                      { 
                        width: `${((userStats.total_xp % 500) / 500) * 100}%`,
                        backgroundColor: colors.primary 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.nextLevelText}>
                  {500 - (userStats.total_xp % 500)} XP bis Level {userStats.current_level + 1}
                </Text>
              </View>
            </View>
          )}

          <ScrollView style={styles.achievementsList}>
            {/* Unlocked Achievements */}
            <View style={styles.achievementCategory}>
              <Text style={styles.categoryTitle}>✅ Freigeschaltet ({achievements.filter(a => a.is_unlocked).length})</Text>
              {achievements
                .filter(a => a.is_unlocked)
                .sort((a, b) => new Date(b.unlocked_at || 0).getTime() - new Date(a.unlocked_at || 0).getTime())
                .map((achievement) => (
                  <View key={achievement.id} style={[styles.achievementCard, styles.unlockedCard]}>
                    <View style={styles.achievementHeader}>
                      <Ionicons 
                        name={achievement.icon as any} 
                        size={24} 
                        color={achievement.color} 
                      />
                      <View style={styles.achievementInfo}>
                        <Text style={styles.achievementTitle}>{achievement.title}</Text>
                        <Text style={styles.achievementDescription}>{achievement.description}</Text>
                      </View>
                      <View style={styles.achievementReward}>
                        <Text style={styles.achievementXP}>+{achievement.xp_reward} XP</Text>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      </View>
                    </View>
                  </View>
                ))}
            </View>

            {/* In Progress Achievements */}
            <View style={styles.achievementCategory}>
              <Text style={styles.categoryTitle}>⏳ In Arbeit ({achievements.filter(a => !a.is_unlocked && a.current_count > 0).length})</Text>
              {achievements
                .filter(a => !a.is_unlocked && a.current_count > 0)
                .sort((a, b) => (b.current_count / b.requirement_count) - (a.current_count / a.requirement_count))
                .map((achievement) => (
                  <View key={achievement.id} style={styles.achievementCard}>
                    <View style={styles.achievementHeader}>
                      <Ionicons 
                        name={achievement.icon as any} 
                        size={24} 
                        color={achievement.color} 
                      />
                      <View style={styles.achievementInfo}>
                        <Text style={styles.achievementTitle}>{achievement.title}</Text>
                        <Text style={styles.achievementDescription}>{achievement.description}</Text>
                      </View>
                      <Text style={styles.achievementXP}>+{achievement.xp_reward} XP</Text>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
                        <View 
                          style={[
                            styles.progressFill,
                            { 
                              width: `${(achievement.current_count / achievement.requirement_count) * 100}%`,
                              backgroundColor: achievement.color
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {achievement.current_count}/{achievement.requirement_count}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>

            {/* Locked Achievements */}
            <View style={styles.achievementCategory}>
              <Text style={styles.categoryTitle}>🔒 Gesperrt ({achievements.filter(a => !a.is_unlocked && a.current_count === 0).length})</Text>
              {achievements
                .filter(a => !a.is_unlocked && a.current_count === 0)
                .slice(0, 5) // Only show first 5 locked achievements
                .map((achievement) => (
                  <View key={achievement.id} style={[styles.achievementCard, styles.lockedCard]}>
                    <View style={styles.achievementHeader}>
                      <Ionicons 
                        name={achievement.icon as any} 
                        size={24} 
                        color={colors.textSecondary} 
                      />
                      <View style={styles.achievementInfo}>
                        <Text style={[styles.achievementTitle, { color: colors.textSecondary }]}>
                          {achievement.title}
                        </Text>
                        <Text style={styles.achievementDescription}>{achievement.description}</Text>
                      </View>
                      <Text style={[styles.achievementXP, { color: colors.textSecondary }]}>
                        +{achievement.xp_reward} XP
                      </Text>
                    </View>
                  </View>
                ))}
              
              {achievements.filter(a => !a.is_unlocked && a.current_count === 0).length > 5 && (
                <Text style={styles.moreAchievementsText}>
                  ... und {achievements.filter(a => !a.is_unlocked && a.current_count === 0).length - 5} weitere Erfolge
                </Text>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Einstellungen</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.settingsContainer}>
            {/* Theme Selector */}
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>🎨 App-Design</Text>
              <View style={styles.themeSelector}>
                {Object.entries(themes).map(([themeKey, theme]) => (
                  <TouchableOpacity
                    key={themeKey}
                    style={[
                      styles.themeOption,
                      { backgroundColor: theme.primary + '20' },
                      currentTheme === themeKey && styles.themeOptionActive
                    ]}
                    onPress={() => updateTheme(themeKey)}
                  >
                    <View style={[styles.themeColorPreview, { backgroundColor: theme.primary }]} />
                    <Text style={[
                      styles.themeOptionText,
                      { color: currentTheme === themeKey ? colors.text : colors.textSecondary }
                    ]}>
                      {themeKey === 'pink' ? 'Rosa (Standard)'
  : themeKey === 'pinkPastel' ? 'Rosa Pastell'
  : themeKey === 'pinkNormal' ? 'Rosa Kräftig'
  : themeKey}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notification Settings */}
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>🔔 Benachrichtigungen</Text>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Morgens-Tabletten</Text>
                <Text style={styles.settingValue}>08:00</Text>
              </View>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Abends-Tabletten</Text>
                <Text style={styles.settingValue}>20:00</Text>
              </View>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Gewichts-Erinnerung</Text>
                <Text style={styles.settingValue}>07:00</Text>
              </View>
            </View>

            {/* App Info */}
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>ℹ️ App-Information</Text>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Version</Text>
                <Text style={styles.settingValue}>1.0.0</Text>
              </View>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Entwickelt von</Text>
                <Text style={[styles.settingValue, { color: colors.primary }]}>Gugi 💖</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal visible={showSaveChatModal} animationType="slide" transparent>
        <View style={styles.saveModalOverlay}>
          <View style={styles.saveModal}>
            <View style={styles.saveModalHeader}>
              <Text style={styles.saveModalTitle}>Nachricht speichern</Text>
              <TouchableOpacity onPress={() => setShowSaveChatModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.saveModalLabel}>Titel:</Text>
            <TextInput
              style={styles.saveModalInput}
              value={saveTitle}
              onChangeText={setSaveTitle}
              placeholder="Geben Sie einen Titel ein..."
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.saveModalLabel}>Kategorie:</Text>
            <ScrollView horizontal style={styles.saveCategorySelector} showsHorizontalScrollIndicator={false}>
              {Object.entries(CHAT_CATEGORIES).map(([key, category]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.saveCategoryButton,
                    saveCategory === key && styles.saveCategoryButtonActive
                  ]}
                  onPress={() => setSaveCategory(key)}
                >
                  <Ionicons name={category.icon as any} size={16} color={category.color} />
                  <Text style={[
                    styles.saveCategoryButtonText,
                    saveCategory === key && styles.saveCategoryButtonTextActive
                  ]}>{category.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.saveModalLabel}>Tags (optional, durch Komma getrennt):</Text>
            <TextInput
              style={styles.saveModalInput}
              value={saveTags}
              onChangeText={setSaveTags}
              placeholder="z.B. abnehmen, motivation, rezept"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.saveModalButtons}>
              <TouchableOpacity
                style={[styles.saveModalButton, styles.saveModalCancelButton]}
                onPress={() => setShowSaveChatModal(false)}
              >
                <Text style={styles.saveModalCancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveModalButton, styles.saveModalSaveButton]}
                onPress={saveChatMessage}
              >
                <Text style={styles.saveModalSaveButtonText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Weight Input Modal */}
      <Modal
        visible={showWeightInput}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWeightInput(false)}
      >
        <View style={styles.fullScreenModalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gewicht eingeben</Text>
            
            <Text style={styles.saveModalLabel}>Bitte geben Sie Ihr heutiges Gewicht ein (kg):</Text>
            <TextInput
              style={styles.saveModalInput}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="z.B. 70.5"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              autoFocus={true}
            />

            <View style={styles.saveModalButtons}>
              <TouchableOpacity
                style={[styles.saveModalButton, styles.saveModalCancelButton]}
                onPress={() => {
                  setShowWeightInput(false);
                  setWeightInput('');
                }}
              >
                <Text style={styles.saveModalCancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveModalButton, styles.saveModalSaveButton]}
                onPress={submitWeightEntry}
              >
                <Text style={styles.saveModalSaveButtonText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Weight Goals Modal */}
      <Modal
        visible={showWeightGoals}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWeightGoals(false)}
      >
        <View style={styles.fullScreenModalOverlay}>
          <View style={styles.fullScreenModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gewichtsziele</Text>
              <TouchableOpacity onPress={() => setShowWeightGoals(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {/* Current Active Goal */}
              {activeWeightGoal && (
                <View style={styles.activeGoalCard}>
                  <Text style={styles.activeGoalTitle}>Aktives Ziel</Text>
                  <Text style={styles.activeGoalText}>
                    Von {activeWeightGoal.start_weight} kg auf {activeWeightGoal.target_weight} kg
                  </Text>
                  <Text style={styles.activeGoalDate}>
                    Bis zum {new Date(activeWeightGoal.target_date).toLocaleDateString('de-DE')}
                  </Text>
                  {dashboardData?.weight && (
                    <Text style={styles.activeGoalProgress}>
                      Fortschritt: {(activeWeightGoal.start_weight - dashboardData.weight.weight).toFixed(1)} kg 
                      von {(activeWeightGoal.start_weight - activeWeightGoal.target_weight!).toFixed(1)} kg
                    </Text>
                  )}
                </View>
              )}

              {/* Create New Goal */}
              <View style={styles.createGoalCard}>
                <Text style={styles.createGoalTitle}>Neues Gewichtsziel erstellen</Text>
                
                <Text style={styles.goalInputLabel}>Zielgewicht (kg):</Text>
                <TextInput
                  style={styles.goalInput}
                  value={goalTargetWeight}
                  onChangeText={setGoalTargetWeight}
                  placeholder="z.B. 70.0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.goalInputLabel}>Bis zum Datum:</Text>
                <TextInput
                  style={styles.goalInput}
                  value={goalTargetDate}
                  onChangeText={setGoalTargetDate}
                  placeholder="YYYY-MM-DD (z.B. 2025-12-31)"
                  placeholderTextColor={colors.textSecondary}
                />

                <TouchableOpacity
                  style={styles.createGoalButton}
                  onPress={createWeightGoal}
                >
                  <Text style={styles.createGoalButtonText}>Ziel erstellen</Text>
                </TouchableOpacity>
              </View>

              {/* Goal History */}
              {weightGoals.length > 0 && (
                <View style={styles.goalHistoryCard}>
                  <Text style={styles.goalHistoryTitle}>Alle Ziele</Text>
                  {weightGoals.map((goal) => (
                    <View key={goal.id} style={[
                      styles.goalHistoryItem,
                      goal.is_active && styles.activeGoalHistoryItem
                    ]}>
                      <Text style={styles.goalHistoryText}>
                        {goal.start_weight} kg → {goal.target_weight} kg
                      </Text>
                      <Text style={styles.goalHistoryDate}>
                        {new Date(goal.target_date).toLocaleDateString('de-DE')}
                      </Text>
                      {goal.is_active && (
                        <Text style={styles.activeGoalBadge}>Aktiv</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reminders Modal */}
      <Modal
        visible={showReminders}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReminders(false)}
      >
        <View style={styles.fullScreenModalOverlay}>
          <View style={styles.fullScreenModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Erinnerungen</Text>
              <TouchableOpacity onPress={() => setShowReminders(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {/* Create New Reminder */}
              <View style={styles.createReminderCard}>
                <Text style={styles.createReminderTitle}>Neue Erinnerung erstellen</Text>
                
                <Text style={styles.reminderInputLabel}>Typ:</Text>
                <View style={styles.reminderTypeContainer}>
                  {[
                    { value: 'pills_morning', label: 'Tabletten Morgens' },
                    { value: 'pills_evening', label: 'Tabletten Abends' },
                    { value: 'weight', label: 'Gewicht eingeben' },
                    { value: 'drinks', label: 'Getränke trinken' },
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.reminderTypeButton,
                        newReminderType === type.value && styles.reminderTypeButtonActive
                      ]}
                      onPress={() => setNewReminderType(type.value)}
                    >
                      <Text style={[
                        styles.reminderTypeButtonText,
                        newReminderType === type.value && styles.reminderTypeButtonTextActive
                      ]}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.reminderInputLabel}>Zeit:</Text>
                <TextInput
                  style={styles.reminderTimeInput}
                  value={newReminderTime}
                  onChangeText={setNewReminderTime}
                  placeholder="HH:MM (z.B. 08:00)"
                  placeholderTextColor={colors.textSecondary}
                />

                <TouchableOpacity
                  style={styles.createReminderButton}
                  onPress={createReminder}
                >
                  <Text style={styles.createReminderButtonText}>Erinnerung erstellen</Text>
                </TouchableOpacity>
              </View>

              {/* Existing Reminders */}
              {reminders.length > 0 && (
                <View style={styles.existingRemindersCard}>
                  <Text style={styles.existingRemindersTitle}>Aktive Erinnerungen</Text>
                  {reminders.map((reminder) => (
                    <View key={reminder.id} style={styles.reminderItem}>
                      <View style={styles.reminderInfo}>
                        <Text style={styles.reminderType}>
                          {reminder.reminder_type === 'pills_morning' && 'Tabletten Morgens'}
                          {reminder.reminder_type === 'pills_evening' && 'Tabletten Abends'}
                          {reminder.reminder_type === 'weight' && 'Gewicht eingeben'}
                          {reminder.reminder_type === 'drinks' && 'Getränke trinken'}
                        </Text>
                        <Text style={styles.reminderTime}>{reminder.time}</Text>
                      </View>
                      <View style={styles.reminderActions}>
                        <TouchableOpacity
                          style={[
                            styles.toggleReminderButton,
                            reminder.is_enabled && styles.toggleReminderButtonActive
                          ]}
                          onPress={() => toggleReminder(reminder.id, reminder.is_enabled)}
                        >
                          <Ionicons 
                            name={reminder.is_enabled ? "notifications" : "notifications-off"} 
                            size={20} 
                            color={reminder.is_enabled ? colors.primary : colors.textSecondary} 
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteReminderButton}
                          onPress={() => deleteReminder(reminder.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {reminders.length === 0 && (
                <View style={styles.noRemindersCard}>
                  <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.noRemindersText}>Keine Erinnerungen erstellt</Text>
                  <Text style={styles.noRemindersSubText}>
                    Erstellen Sie Ihre erste Erinnerung, um rechtzeitig an wichtige Aktivitäten erinnert zu werden.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: getResponsiveValue(12, 16, 20),
    paddingTop: 10,
  },
  headerTitleContainer: {
    marginTop: 15,
    marginBottom: 5,
    flex: 1,
  },
  headerTitle: {
    color: colors.text,
    fontSize: getResponsiveValue(20, 22, 24),
    fontWeight: 'bold',
  },
  headerDate: {
    color: colors.textSecondary,
    fontSize: getResponsiveValue(14, 15, 16),
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginHorizontal: SCREEN_PADDING,
    marginBottom: SECTION_MARGIN,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: getResponsiveValue(18, 19, 20),
    fontWeight: 'bold',
    marginBottom: getResponsiveValue(10, 11, 12),
  },
  pillsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: getResponsiveValue(8, 10, 12),
  },
  pillCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: CARD_PADDING,
    borderRadius: getResponsiveValue(10, 11, 12),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: getResponsiveValue(90, 100, 110),
  },
  pillCardTaken: {
    borderColor: colors.success,
    backgroundColor: colors.success + '20',
  },
  pillText: {
    color: colors.text,
    fontSize: getResponsiveValue(14, 15, 16),
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  pillSubText: {
    color: colors.textSecondary,
    fontSize: getResponsiveValue(10, 11, 12),
    marginTop: 4,
    textAlign: 'center',
  },
  drinksGrid: {
    gap: getResponsiveValue(10, 11, 12),
  },
  drinkCard: {
    backgroundColor: colors.surface,
    padding: CARD_PADDING,
    borderRadius: getResponsiveValue(10, 11, 12),
    borderLeftWidth: 4,
  },
  drinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveValue(10, 11, 12),
  },
  drinkTitle: {
    color: colors.text,
    fontSize: getResponsiveValue(14, 15, 16),
    fontWeight: '600',
    marginLeft: getResponsiveValue(10, 11, 12),
  },
  drinkControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drinkButton: {
    padding: getResponsiveValue(6, 7, 8),
    borderRadius: getResponsiveValue(6, 7, 8),
    minWidth: getResponsiveValue(32, 34, 36),
    alignItems: 'center',
  },
  drinkCount: {
    color: colors.text,
    fontSize: getResponsiveValue(20, 22, 24),
    fontWeight: 'bold',
    minWidth: getResponsiveValue(35, 38, 40),
    textAlign: 'center',
  },
  weightCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  weightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInfo: {
    flex: 1,
    marginLeft: 16,
  },
  weightValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  weightDate: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  goalDetails: {
    gap: 6,
  },
  goalText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  navigationSection: {
    margin: 16,
    gap: 12,
    marginBottom: 32,
  },
  navButton: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 12,
  },
  navButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  chartPeriodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: colors.text,
  },
  chartContainer: {
    flex: 1,
    padding: 20,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  chatWelcome: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  chatWelcomeText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  chatMessage: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  chatMessageText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
  },
  saveMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  saveMessageButtonText: {
    color: colors.primary,
    fontSize: 12,
    marginLeft: 4,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.surface,
    alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  chatSendButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Weight Progress Styles
  progressDaysSelector: {
    padding: 16,
  },
  progressDaysLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressDaysButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDaysButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  progressDaysButtonActive: {
    backgroundColor: colors.primary,
  },
  progressDaysButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  progressDaysButtonTextActive: {
    color: colors.text,
  },
  progressSummary: {
    backgroundColor: colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  progressSummaryTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  progressSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressSummaryLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  progressSummaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  progressList: {
    flex: 1,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  progressHeaderText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  progressItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface + '80',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  progressDateColumn: {
    flex: 1,
    alignItems: 'center',
  },
  progressDay: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  progressDate: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  progressWeightColumn: {
    flex: 1,
    alignItems: 'center',
  },
  progressWeight: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressDifferenceColumn: {
    flex: 1,
    alignItems: 'center',
  },
  progressDifference: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Saved Messages Styles
  categorySelector: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  categoryButtonTextActive: {
    color: colors.text,
  },
  savedMessagesList: {
    flex: 1,
    padding: 16,
  },
  savedMessageCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  savedMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  savedMessageCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedMessageCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  savedMessageDate: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  savedMessageTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  savedMessageContent: {
    marginBottom: 8,
  },
  savedMessageQuestion: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  savedMessageAnswer: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  savedMessageTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  savedMessageTag: {
    backgroundColor: colors.primary + '30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  savedMessageTagText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  // Save Chat Modal Styles
  saveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  saveModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  saveModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  saveModalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveModalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  saveModalInput: {
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  saveCategorySelector: {
    marginVertical: 8,
  },
  saveCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.background,
    marginRight: 8,
  },
  saveCategoryButtonActive: {
    backgroundColor: colors.primary,
  },
  saveCategoryButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  saveCategoryButtonTextActive: {
    color: colors.text,
  },
  saveModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  saveModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveModalCancelButton: {
    backgroundColor: colors.background,
  },
  saveModalSaveButton: {
    backgroundColor: colors.primary,
  },
  saveModalCancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveModalSaveButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  // Special Drink Cards Styles
  specialDrinksContainer: {
    marginTop: SECTION_MARGIN,
    gap: getResponsiveValue(10, 11, 12),
  },
  specialDrinkCard: {
    backgroundColor: colors.surface,
    padding: CARD_PADDING,
    borderRadius: getResponsiveValue(10, 11, 12),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  specialDrinkCardTaken: {
    borderColor: colors.success,
    backgroundColor: colors.success + '20',
  },
  specialDrinkText: {
    color: colors.text,
    fontSize: getResponsiveValue(14, 15, 16),
    fontWeight: '600',
    marginLeft: getResponsiveValue(10, 11, 12),
    flex: 1,
  },
  specialDrinkSubText: {
    color: colors.textSecondary,
    fontSize: getResponsiveValue(10, 11, 12),
  },
  // Saved Messages Enhanced Styles
  savedMessageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 4,
  },
  // Water Info Styles
  waterInfoCard: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  waterInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  waterInfoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  waterInfoStatus: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  waterInfoRemaining: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  // Footer Styles
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  footerVersion: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  footerCredit: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Header Enhancement Styles
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  levelContainer: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: getResponsiveValue(8, 10, 12),
    paddingVertical: getResponsiveValue(4, 5, 6),
    borderRadius: 20,
    alignItems: 'center',
    marginLeft: 8,
  },
  levelText: {
    color: colors.primary,
    fontSize: getResponsiveValue(10, 11, 12),
    fontWeight: 'bold',
  },
  xpText: {
    color: colors.primary,
    fontSize: getResponsiveValue(8, 9, 10),
  },
  // Achievement Styles
  statsContainer: {
    padding: 20,
  },
  levelCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  currentLevel: {
    color: colors.text,
    fontSize: 32,
    fontWeight: 'bold',
  },
  currentXP: {
    color: colors.primary,
    fontSize: 16,
    marginBottom: 12,
  },
  xpProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginBottom: 8,
  },
  xpProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  nextLevelText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  achievementsList: {
    flex: 1,
    padding: 16,
  },
  achievementCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementInfo: {
    flex: 1,
    marginLeft: 12,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementDescription: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  achievementXP: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
    minWidth: 50,
    textAlign: 'right',
  },
  // Settings Styles
  settingsContainer: {
    flex: 1,
    padding: 16,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingSectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  themeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionActive: {
    borderColor: colors.primary,
  },
  themeColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 16,
  },
  settingValue: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  // Achievement Preview Styles (Main Page)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveValue(10, 11, 12),
  },
  seeAllText: {
    color: colors.primary,
    fontSize: getResponsiveValue(12, 13, 14),
    fontWeight: '600',
  },
  achievementPreview: {
    paddingVertical: 8,
  },
  achievementPreviewCard: {
    backgroundColor: colors.surface,
    padding: CARD_PADDING,
    borderRadius: getResponsiveValue(10, 11, 12),
    marginRight: getResponsiveValue(10, 11, 12),
    width: getResponsiveValue(120, 135, 140),
    alignItems: 'center',
  },
  achievementPreviewTitle: {
    color: colors.text,
    fontSize: getResponsiveValue(11, 12, 13),
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: getResponsiveValue(6, 7, 8),
    lineHeight: getResponsiveValue(14, 15, 16),
  },
  miniProgressContainer: {
    width: '100%',
    marginVertical: getResponsiveValue(6, 7, 8),
  },
  miniProgressBar: {
    width: '100%',
    height: getResponsiveValue(3, 4, 4),
    borderRadius: 2,
    marginBottom: 4,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  achievementPreviewProgress: {
    color: colors.textSecondary,
    fontSize: getResponsiveValue(9, 10, 10),
    textAlign: 'center',
  },
  achievementPreviewXP: {
    color: colors.primary,
    fontSize: getResponsiveValue(9, 10, 10),
    fontWeight: 'bold',
  },
  // Enhanced Achievement Modal Styles
  levelInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  levelStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  achievementCategory: {
    marginBottom: 24,
  },
  categoryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  unlockedCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  lockedCard: {
    opacity: 0.6,
  },
  achievementReward: {
    alignItems: 'center',
  },
  moreAchievementsText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  // Coming soon styles
  comingSoonContainer: {
    alignItems: 'center',
    padding: 40,
  },
  comingSoonTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal overlay styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Full screen modal overlay for better mobile experience
  fullScreenModalOverlay: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullScreenModalContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalScrollView: {
    flex: 1,
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
  },
  // Date navigation styles
  headerDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  dateNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  dateTextContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  // Weight goals styles
  activeGoalCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  activeGoalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  activeGoalText: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 4,
  },
  activeGoalDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  activeGoalProgress: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  createGoalCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  createGoalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  goalInputLabel: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 8,
    marginTop: 8,
  },
  goalInput: {
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  createGoalButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  createGoalButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  goalHistoryCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  goalHistoryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  goalHistoryItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  activeGoalHistoryItem: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  goalHistoryText: {
    color: colors.text,
    fontSize: 14,
  },
  goalHistoryDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  activeGoalBadge: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Reminders styles
  createReminderCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  createReminderTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  reminderInputLabel: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 8,
    marginTop: 8,
  },
  reminderTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  reminderTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  reminderTypeButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  reminderTypeButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  reminderTypeButtonTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  reminderTimeInput: {
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  createReminderButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  createReminderButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  existingRemindersCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  existingRemindersTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  reminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderType: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  reminderTime: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleReminderButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  toggleReminderButtonActive: {
    backgroundColor: colors.primary + '20',
  },
  deleteReminderButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.error + '20',
  },
  noRemindersCard: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  noRemindersText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  noRemindersSubText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});