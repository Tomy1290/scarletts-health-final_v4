import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type DrinkButtonProps = {
  title: string;
  count: number;
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onIncrement: () => void;
  onDecrement: () => void;
};

export default function DrinkButton({ title, count, color, icon = 'cafe', onIncrement, onDecrement }: DrinkButtonProps) {
  return (
    <View style={[styles.container, { borderLeftColor: color }]}>
      <View style={styles.header}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity onPress={onDecrement} style={[styles.btn, { backgroundColor: color + '30' }]}>
          <Ionicons name="remove" size={18} color={color} />
        </TouchableOpacity>
        <Text style={styles.count}>{count}</Text>
        <TouchableOpacity onPress={onIncrement} style={[styles.btn, { backgroundColor: color + '30' }]}>
          <Ionicons name="add" size={18} color={color} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  count: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});