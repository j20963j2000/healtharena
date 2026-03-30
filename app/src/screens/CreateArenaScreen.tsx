import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Platform, Modal, FlatList,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createArena } from "../lib/api";

const METRICS = [
  { key: "steps", label: "👣 步數", unit: "步" },
  { key: "weight", label: "⚖️ 體重", unit: "kg" },
  { key: "body_fat", label: "🔥 體脂率", unit: "%" },
  { key: "water_ml", label: "💧 飲水量", unit: "ml" },
  { key: "cigarettes", label: "🚬 戒菸", unit: "根(越少越好)" },
];

const SCORING = [
  { key: "daily_goal", label: "每日達標" },
  { key: "final_ranking", label: "最終排名" },
  { key: "improvement", label: "進步幅度" },
];

export default function CreateArenaScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rewardWinner, setRewardWinner] = useState("");
  const [penaltyLoser, setPenaltyLoser] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [maxMembers, setMaxMembers] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedScoring, setSelectedScoring] = useState<string[]>(["daily_goal", "final_ranking", "improvement"]);
  const [dailyGoals, setDailyGoals] = useState<Record<string, string>>({});
  const [reportHourTW, setReportHourTW] = useState(22); // Taiwan time (UTC+8)
  const [loading, setLoading] = useState(false);

  // Taiwan time display options (every hour)
  const REPORT_HOURS_TW = Array.from({ length: 24 }, (_, i) => i);

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleScoring = (key: string) => {
    setSelectedScoring(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleCreate = async () => {
    if (!name || !rewardWinner || !penaltyLoser) {
      Alert.alert("錯誤", "請填寫所有必填欄位");
      return;
    }
    if (selectedMetrics.length === 0) {
      Alert.alert("錯誤", "請至少選擇一個競技指標");
      return;
    }

    setLoading(true);
    try {
      const goals: Record<string, number> = {};
      selectedMetrics.forEach(m => {
        if (dailyGoals[m]) goals[m] = Number(dailyGoals[m]);
      });

      const reportHourUTC = (reportHourTW - 8 + 24) % 24; // convert Taiwan UTC+8 → UTC

      await createArena({
        name,
        description,
        reward_winner: rewardWinner,
        penalty_loser: penaltyLoser,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        max_members: maxMembers ? Number(maxMembers) : null,
        report_hour: reportHourUTC,
        rules: {
          metrics: selectedMetrics,
          scoring_methods: selectedScoring,
          daily_goal: Object.keys(goals).length > 0 ? goals : null,
        },
      });
      Alert.alert("成功", "競技場創建完成！", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("錯誤", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>基本資訊</Text>

      <TextInput
        style={styles.input}
        placeholder="競技場名稱 *"
        placeholderTextColor="#64748b"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="描述（選填）"
        placeholderTextColor="#64748b"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
        <Text style={styles.dateLabel}>📅 開始日期</Text>
        <Text style={styles.dateValue}>{startDate.toLocaleDateString("zh-TW")}</Text>
      </TouchableOpacity>
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowStartPicker(Platform.OS === "ios");
            if (date) setStartDate(date);
          }}
        />
      )}

      <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
        <Text style={styles.dateLabel}>🏁 結束日期</Text>
        <Text style={styles.dateValue}>{endDate.toLocaleDateString("zh-TW")}</Text>
      </TouchableOpacity>
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={startDate}
          onChange={(_, date) => {
            setShowEndPicker(Platform.OS === "ios");
            if (date) setEndDate(date);
          }}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="人數上限（不填 = 無限制）"
        placeholderTextColor="#64748b"
        value={maxMembers}
        onChangeText={setMaxMembers}
        keyboardType="numeric"
      />

      <Text style={styles.sectionTitle}>獎懲設定</Text>
      <TextInput
        style={styles.input}
        placeholder="🏆 贏家獎勵 * (例：輸家請吃大餐)"
        placeholderTextColor="#64748b"
        value={rewardWinner}
        onChangeText={setRewardWinner}
      />
      <TextInput
        style={styles.input}
        placeholder="😈 輸家懲罰 * (例：發100元紅包)"
        placeholderTextColor="#64748b"
        value={penaltyLoser}
        onChangeText={setPenaltyLoser}
      />

      <Text style={styles.sectionTitle}>競技指標（可複選）</Text>
      {METRICS.map(m => (
        <View key={m.key}>
          <TouchableOpacity
            style={[styles.chip, selectedMetrics.includes(m.key) && styles.chipSelected]}
            onPress={() => toggleMetric(m.key)}
          >
            <Text style={[styles.chipText, selectedMetrics.includes(m.key) && styles.chipTextSelected]}>
              {m.label}
            </Text>
            {selectedMetrics.includes(m.key) && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          {selectedMetrics.includes(m.key) && (
            <TextInput
              style={styles.goalInput}
              placeholder={`每日目標 ${m.unit}（選填）`}
              placeholderTextColor="#64748b"
              value={dailyGoals[m.key] ?? ""}
              onChangeText={v => setDailyGoals(prev => ({ ...prev, [m.key]: v }))}
              keyboardType="numeric"
            />
          )}
        </View>
      ))}

      <Text style={styles.sectionTitle}>積分方式（可複選）</Text>
      {SCORING.map(s => (
        <TouchableOpacity
          key={s.key}
          style={[styles.chip, selectedScoring.includes(s.key) && styles.chipSelected]}
          onPress={() => toggleScoring(s.key)}
        >
          <Text style={[styles.chipText, selectedScoring.includes(s.key) && styles.chipTextSelected]}>
            {s.label}
          </Text>
          {selectedScoring.includes(s.key) && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>AI 戰報時間（台灣時間）</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourScroll}>
        {REPORT_HOURS_TW.map(h => (
          <TouchableOpacity
            key={h}
            style={[styles.hourChip, reportHourTW === h && styles.hourChipSelected]}
            onPress={() => setReportHourTW(h)}
          >
            <Text style={[styles.hourChipText, reportHourTW === h && styles.hourChipTextSelected]}>
              {String(h).padStart(2, "0")}:00
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "創建中..." : "⚔️ 創建競技場"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 16, fontWeight: "bold", color: "#94a3b8",
    marginTop: 20, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1,
  },
  input: {
    backgroundColor: "#1e293b", color: "#f8fafc",
    borderRadius: 12, padding: 14, marginBottom: 10, fontSize: 15,
  },
  goalInput: {
    backgroundColor: "#0f172a", color: "#f8fafc",
    borderRadius: 8, padding: 10, marginBottom: 8, marginTop: -4,
    marginLeft: 12, fontSize: 14, borderWidth: 1, borderColor: "#334155",
  },
  chip: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#1e293b", borderRadius: 12,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#334155",
  },
  chipSelected: { backgroundColor: "#312e81", borderColor: "#6366f1" },
  chipText: { color: "#94a3b8", fontSize: 15 },
  chipTextSelected: { color: "#f8fafc", fontWeight: "bold" },
  checkmark: { color: "#6366f1", fontWeight: "bold", fontSize: 16 },
  dateButton: {
    backgroundColor: "#1e293b", borderRadius: 12,
    padding: 14, marginBottom: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  dateLabel: { color: "#94a3b8", fontSize: 15 },
  dateValue: { color: "#6366f1", fontWeight: "bold", fontSize: 15 },
  hourScroll: { marginBottom: 12 },
  hourChip: {
    backgroundColor: "#1e293b", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    marginRight: 8, borderWidth: 1, borderColor: "#334155",
  },
  hourChipSelected: { backgroundColor: "#312e81", borderColor: "#6366f1" },
  hourChipText: { color: "#94a3b8", fontSize: 14 },
  hourChipTextSelected: { color: "#f8fafc", fontWeight: "bold" },
  button: {
    backgroundColor: "#6366f1", borderRadius: 14,
    padding: 16, alignItems: "center", marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
