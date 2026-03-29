import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from "react-native";
import { upsertHealthData } from "../lib/api";
import { useHealthKit } from "../hooks/useHealthKit";

const FIELDS = [
  { key: "steps", label: "👣 步數", unit: "步", keyboard: "numeric" as const },
  { key: "weight", label: "⚖️ 體重", unit: "kg", keyboard: "decimal-pad" as const },
  { key: "body_fat", label: "🔥 體脂率", unit: "%", keyboard: "decimal-pad" as const },
  { key: "water_ml", label: "💧 飲水量", unit: "ml", keyboard: "numeric" as const },
  { key: "cigarettes", label: "🚬 抽菸數", unit: "根（0 = 戒菸成功）", keyboard: "numeric" as const },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function HealthInputScreen() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { available, fetchTodayData } = useHealthKit();

  const handleSyncHealthKit = async () => {
    setSyncing(true);
    try {
      const data = await fetchTodayData();
      if (Object.keys(data).length === 0) {
        Alert.alert("同步失敗", "無法讀取健康數據，請確認已授權 HealthKit 權限");
        return;
      }
      const newValues = { ...values };
      if (data.steps) newValues.steps = String(data.steps);
      if (data.weight) newValues.weight = String(data.weight);
      if (data.body_fat) newValues.body_fat = String(data.body_fat);
      if (data.water_ml) newValues.water_ml = String(data.water_ml);
      setValues(newValues);
      Alert.alert("同步成功 ✅", "已從 Apple 健康 app 讀取今日數據，確認後請按儲存");
    } catch (e: any) {
      Alert.alert("錯誤", e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    const hasAny = FIELDS.some(f => values[f.key] !== undefined && values[f.key] !== "");
    if (!hasAny) {
      Alert.alert("錯誤", "請至少輸入一項數據");
      return;
    }

    setLoading(true);
    try {
      const data: Record<string, any> = { date, source: "manual" };
      FIELDS.forEach(f => {
        if (values[f.key] !== undefined && values[f.key] !== "") {
          data[f.key] = Number(values[f.key]);
        }
      });

      await upsertHealthData(data);
      Alert.alert("儲存成功", "今日健康數據已記錄！💪");
    } catch (e: any) {
      Alert.alert("錯誤", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>健康數據記錄</Text>
        {available && (
          <TouchableOpacity style={styles.syncBtn} onPress={handleSyncHealthKit} disabled={syncing}>
            <Text style={styles.syncBtnText}>{syncing ? "同步中..." : "⌚ 從健康 App 同步"}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>📅 日期</Text>
        <TextInput
          style={styles.dateInput}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748b"
        />
      </View>

      {FIELDS.map(f => (
        <View key={f.key} style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>{f.label}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.fieldInput}
              placeholder="—"
              placeholderTextColor="#334155"
              value={values[f.key] ?? ""}
              onChangeText={v => setValues(prev => ({ ...prev, [f.key]: v }))}
              keyboardType={f.keyboard}
            />
            <Text style={styles.unit}>{f.unit}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "儲存中..." : "💾 儲存今日數據"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "bold", color: "#f8fafc" },
  syncBtn: { backgroundColor: "#1e293b", borderRadius: 10, padding: 8, borderWidth: 1, borderColor: "#6366f1" },
  syncBtnText: { color: "#6366f1", fontSize: 12, fontWeight: "bold" },
  dateRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1e293b", borderRadius: 12,
    padding: 14, marginBottom: 16,
  },
  dateLabel: { color: "#94a3b8", fontSize: 15, marginRight: 12 },
  dateInput: { color: "#f8fafc", fontSize: 15, flex: 1 },
  fieldCard: {
    backgroundColor: "#1e293b", borderRadius: 12,
    padding: 16, marginBottom: 10,
  },
  fieldLabel: { color: "#94a3b8", fontSize: 13, marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "center" },
  fieldInput: {
    color: "#f8fafc", fontSize: 28, fontWeight: "bold",
    flex: 1, padding: 0,
  },
  unit: { color: "#475569", fontSize: 14, marginLeft: 8 },
  button: {
    backgroundColor: "#6366f1", borderRadius: 14,
    padding: 16, alignItems: "center", marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
