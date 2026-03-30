import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView,
  Platform, Keyboard, Dimensions,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useFocusEffect } from "@react-navigation/native";
import { upsertHealthData, getHealthData } from "../lib/api";
import { useHealthKit } from "../hooks/useHealthKit";

const SCREEN_WIDTH = Dimensions.get("window").width;

const FIELDS = [
  { key: "steps",     label: "👣 步數",   unit: "步",              keyboard: "numeric" as const,      color: "#6366f1" },
  { key: "weight",    label: "⚖️ 體重",   unit: "kg",              keyboard: "decimal-pad" as const,  color: "#10b981" },
  { key: "body_fat",  label: "🔥 體脂率", unit: "%",               keyboard: "decimal-pad" as const,  color: "#f59e0b" },
  { key: "water_ml",  label: "💧 飲水量", unit: "ml",              keyboard: "numeric" as const,      color: "#38bdf8" },
  { key: "cigarettes",label: "🚬 抽菸數", unit: "根",              keyboard: "numeric" as const,      color: "#f43f5e" },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(d: string) {
  return d.slice(5); // MM-DD
}

export default function HealthInputScreen() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState("steps");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const { available, fetchTodayData } = useHealthKit();

  const loadHistory = async () => {
    try {
      const data = await getHealthData();
      if (Array.isArray(data)) setHistory(data.slice(0, 30));
    } catch {}
  };

  useFocusEffect(useCallback(() => { loadHistory(); }, []));

  // Build chart data for the selected metric (oldest→newest, max 14 points)
  const chartData = useMemo(() => {
    const points = history
      .filter(item => item[selectedMetric] != null)
      .slice(0, 14)
      .reverse();

    if (points.length < 2) return null;

    const field = FIELDS.find(f => f.key === selectedMetric)!;
    return {
      labels: points.map(p => fmtDate(p.date)),
      datasets: [{
        data: points.map(p => Number(p[selectedMetric])),
        color: () => field.color,
        strokeWidth: 2,
      }],
    };
  }, [history, selectedMetric]);

  const toggleDate = (d: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

  const handleSyncHealthKit = async () => {
    setSyncing(true);
    try {
      const data = await fetchTodayData();
      if (Object.keys(data).length === 0) {
        Alert.alert("同步失敗", "無法讀取健康數據，請確認已授權 HealthKit 權限");
        return;
      }
      const newValues = { ...values };
      if (data.steps)    newValues.steps    = String(data.steps);
      if (data.weight)   newValues.weight   = String(data.weight);
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
    Keyboard.dismiss();
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
      setValues({});
      await loadHistory();
    } catch (e: any) {
      Alert.alert("錯誤", e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedField = FIELDS.find(f => f.key === selectedMetric)!;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Input Form ── */}
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
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
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

        {/* ── Trend Charts ── */}
        {history.length >= 2 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>📈 趨勢圖表</Text>

            {/* Metric tab selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricTabs}>
              {FIELDS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.metricTab, selectedMetric === f.key && { borderColor: f.color, backgroundColor: f.color + "22" }]}
                  onPress={() => setSelectedMetric(f.key)}
                >
                  <Text style={[styles.metricTabText, selectedMetric === f.key && { color: f.color }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Chart or empty state */}
            {chartData ? (
              <LineChart
                data={chartData}
                width={SCREEN_WIDTH - 32}
                height={180}
                chartConfig={{
                  backgroundColor: "#1e293b",
                  backgroundGradientFrom: "#1e293b",
                  backgroundGradientTo: "#0f172a",
                  decimalPlaces: selectedMetric === "weight" || selectedMetric === "body_fat" ? 1 : 0,
                  color: () => selectedField.color,
                  labelColor: () => "#64748b",
                  propsForDots: { r: "4", strokeWidth: "2", stroke: selectedField.color },
                  propsForBackgroundLines: { stroke: "#1e293b" },
                }}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={false}
              />
            ) : (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>此指標數據不足（需至少 2 天）</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Collapsible History ── */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>📋 歷史紀錄</Text>
            {history.map(item => {
              const isExpanded = expandedDates.has(item.date);
              const filledFields = FIELDS.filter(f => item[f.key] != null);
              return (
                <View key={item.date} style={styles.historyCard}>
                  <TouchableOpacity style={styles.historyHeader} onPress={() => toggleDate(item.date)}>
                    <Text style={styles.historyDate}>{item.date}</Text>
                    <View style={styles.historyHeaderRight}>
                      <Text style={styles.historyCount}>{filledFields.length} 項數據</Text>
                      <Text style={styles.collapseIcon}>{isExpanded ? "▲" : "▼"}</Text>
                    </View>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.historyBody}>
                      {filledFields.map(f => (
                        <View key={f.key} style={styles.historyRow}>
                          <Text style={styles.historyFieldLabel}>{f.label}</Text>
                          <Text style={[styles.historyFieldValue, { color: f.color }]}>
                            {item[f.key]} <Text style={styles.historyUnit}>{f.unit}</Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 16, paddingBottom: 60 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "bold", color: "#f8fafc" },
  syncBtn: { backgroundColor: "#1e293b", borderRadius: 10, padding: 8, borderWidth: 1, borderColor: "#6366f1" },
  syncBtnText: { color: "#6366f1", fontSize: 12, fontWeight: "bold" },
  dateRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 16 },
  dateLabel: { color: "#94a3b8", fontSize: 15, marginRight: 12 },
  dateInput: { color: "#f8fafc", fontSize: 15, flex: 1 },
  fieldCard: { backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 10 },
  fieldLabel: { color: "#94a3b8", fontSize: 13, marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "center" },
  fieldInput: { color: "#f8fafc", fontSize: 28, fontWeight: "bold", flex: 1, padding: 0 },
  unit: { color: "#475569", fontSize: 14, marginLeft: 8 },
  button: { backgroundColor: "#6366f1", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 24 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  // Chart
  chartSection: { marginTop: 32 },
  sectionTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  metricTabs: { marginBottom: 12 },
  metricTab: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginRight: 8, borderWidth: 1, borderColor: "#334155",
  },
  metricTabText: { color: "#64748b", fontSize: 13 },
  chart: { borderRadius: 12, marginLeft: -8 },
  chartEmpty: { backgroundColor: "#1e293b", borderRadius: 12, padding: 24, alignItems: "center" },
  chartEmptyText: { color: "#475569", fontSize: 14 },

  // History
  historySection: { marginTop: 32 },
  historyCard: { backgroundColor: "#1e293b", borderRadius: 12, marginBottom: 8, overflow: "hidden" },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  historyDate: { color: "#f8fafc", fontSize: 15, fontWeight: "600" },
  historyHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyCount: { color: "#475569", fontSize: 13 },
  collapseIcon: { color: "#64748b", fontSize: 11 },
  historyBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: "#334155" },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  historyFieldLabel: { color: "#94a3b8", fontSize: 14 },
  historyFieldValue: { fontSize: 16, fontWeight: "bold" },
  historyUnit: { fontSize: 12, fontWeight: "normal", color: "#64748b" },
});
