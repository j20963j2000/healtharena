import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { getArenaReports } from "../lib/api";

interface Report {
  id: string;
  date: string;
  content: string;
}

export default function ReportScreen({ route }: any) {
  const { arenaId } = route.params ?? {};
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await getArenaReports(arenaId);
    setReports(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#6366f1" size="large" />
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>📰 戰神阿報</Text>
      <Text style={styles.subtitle}>每日 22:00 準時開噴</Text>

      {reports.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🤫</Text>
          <Text style={styles.emptyText}>戰報還沒出爐</Text>
          <Text style={styles.emptySubtext}>今晚 22:00 等著被嘲諷吧</Text>
        </View>
      ) : (
        reports.map(r => (
          <View key={r.id} style={styles.reportCard}>
            <Text style={styles.reportDate}>📅 {r.date}</Text>
            <Text style={styles.reportContent}>{r.content}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  title: { fontSize: 24, fontWeight: "bold", color: "#f8fafc", marginTop: 8 },
  subtitle: { color: "#64748b", marginBottom: 20 },
  reportCard: {
    backgroundColor: "#1e293b", borderRadius: 16,
    padding: 16, marginBottom: 16,
  },
  reportDate: { color: "#6366f1", fontWeight: "bold", marginBottom: 10 },
  reportContent: { color: "#e2e8f0", fontSize: 15, lineHeight: 24 },
  emptyCard: {
    backgroundColor: "#1e293b", borderRadius: 16,
    padding: 40, alignItems: "center", marginTop: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#f8fafc", fontSize: 18, fontWeight: "bold" },
  emptySubtext: { color: "#64748b", marginTop: 4 },
});
