import 'react-native-gesture-handler';
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
  Share,
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

// ... Rest of file is unchanged (kept as in repository) ...