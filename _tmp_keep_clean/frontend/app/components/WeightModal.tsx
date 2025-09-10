import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type WeightInputModalProps = {
  visible: boolean;
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  onSave: () => void;
  colors: { text: string; background: string; surface: string; primary: string; textSecondary: string };
};

export function WeightInputModal({ visible, value, onChange, onClose, onSave, colors }: WeightInputModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Gewicht eingeben</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Gewicht (kg)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.textSecondary + '40', backgroundColor: colors.background }]}
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              placeholder="z.B. 72.4"
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity onPress={onSave} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryBtnText}>Speichern</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type WeightGoalsModalProps = {
  visible: boolean;
  onClose: () => void;
  colors: { text: string; background: string; surface: string; primary: string; textSecondary: string };
  currentWeight?: number;
  targetWeight: string;
  targetDate: string;
  onChangeTargetWeight: (v: string) => void;
  onChangeTargetDate: (v: string) => void;
  onCreate: () => void;
};

export function WeightGoalsModal({ visible, onClose, colors, currentWeight, targetWeight, targetDate, onChangeTargetWeight, onChangeTargetDate, onCreate }: WeightGoalsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={[styles.modalContainer, { backgroundColor: colors.background }]}> 
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Gewichtsziele</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Aktuelles Gewicht</Text>
            <Text style={[styles.valueText, { color: colors.text }]}>{currentWeight ? `${currentWeight} kg` : '--'}</Text>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Zielgewicht (kg)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.textSecondary + '40', backgroundColor: colors.background }]}
              value={targetWeight}
              onChangeText={onChangeTargetWeight}
              keyboardType="decimal-pad"
              placeholder="z.B. 65"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Zieldatum (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.textSecondary + '40', backgroundColor: colors.background }]}
              value={targetDate}
              onChangeText={onChangeTargetDate}
              placeholder="2025-12-31"
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity onPress={onCreate} style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 16 }]}>
              <Text style={styles.primaryBtnText}>Ziel erstellen</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
  },
  label: {
    fontSize: 14,
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});