import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getMyArenas } from "../lib/api";

export default function HomeScreen({ navigation }: any) {
  const [arenas, setArenas] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await getMyArenas();
    setArenas(Array.isArray(data) ? data : []);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>我的競技場</Text>
      <FlatList
        data={arenas}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }: any) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("ArenaDetail", { arena: item })}
          >
            <Text style={styles.arenaName}>{item.name}</Text>
            <Text style={styles.arenaStatus}>
              {item.status === "active" ? "🔥 進行中" :
               item.status === "pending" ? "⏳ 等待開始" : "✅ 已結束"}
            </Text>
            {item.creator_name && (
              <Text style={styles.arenaCreator}>👤 {item.creator_name}</Text>
            )}
            <Text style={styles.arenaDate}>
              {item.start_date} → {item.end_date}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>還沒有競技場，趕快創建或加入一個吧！</Text>
        }
      />
      <View style={styles.fab_container}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("CreateArena")}
        >
          <Text style={styles.fabText}>+ 創建競技場</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => navigation.navigate("JoinArena")}
        >
          <Text style={styles.fabText}>加入競技場</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  header: { fontSize: 24, fontWeight: "bold", color: "#f8fafc", marginBottom: 16, marginTop: 8 },
  card: {
    backgroundColor: "#1e293b", borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  arenaName: { fontSize: 18, fontWeight: "bold", color: "#f8fafc" },
  arenaStatus: { color: "#94a3b8", marginTop: 4 },
  arenaCreator: { color: "#64748b", fontSize: 12, marginTop: 4 },
  arenaDate: { color: "#64748b", fontSize: 12, marginTop: 2 },
  empty: { color: "#64748b", textAlign: "center", marginTop: 40, fontSize: 16 },
  fab_container: { flexDirection: "row", gap: 12, marginTop: 8 },
  fab: {
    flex: 1, backgroundColor: "#6366f1",
    borderRadius: 12, padding: 14, alignItems: "center",
  },
  fabSecondary: { backgroundColor: "#334155" },
  fabText: { color: "#fff", fontWeight: "bold" },
});
