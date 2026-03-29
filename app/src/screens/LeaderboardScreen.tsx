import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { getLeaderboard } from "../lib/api";
import { shareLeaderboard } from "../lib/share";
import { useAuthStore } from "../store/authStore";

interface Member {
  user_id: string;
  username: string;
  avatar_url?: string;
  today_steps: number;
  today_water: number;
  weight?: number;
  body_fat?: number;
  total_score: number;
  rank: number;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderboardScreen({ route }: any) {
  const { arenaId, arenaName } = route.params ?? {};
  const { user } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await getLeaderboard(arenaId);
    setMembers(Array.isArray(data) ? data : []);
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
    <View style={styles.container}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.title}>{arenaName ?? "排行榜"}</Text>
        <TouchableOpacity onPress={() => {
          const me = members.find(m => m.user_id === user?.id);
          if (me) shareLeaderboard(arenaName, me.rank, me.total_score, members.length);
        }}>
          <Text style={{ color: "#6366f1", fontWeight: "bold" }}>📤 分享</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>今日戰況</Text>
      <FlatList
        data={members}
        keyExtractor={item => item.user_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item, index }) => (
          <View style={[styles.card, index === 0 && styles.cardFirst]}>
            <Text style={styles.rank}>
              {index < 3 ? MEDAL[index] : `#${index + 1}`}
            </Text>
            <View style={styles.info}>
              <Text style={styles.username}>{item.username}</Text>
              <View style={styles.statsRow}>
                {item.today_steps > 0 && (
                  <Text style={styles.stat}>👣 {item.today_steps.toLocaleString()}</Text>
                )}
                {item.today_water > 0 && (
                  <Text style={styles.stat}>💧 {item.today_water}ml</Text>
                )}
                {item.weight && (
                  <Text style={styles.stat}>⚖️ {item.weight}kg</Text>
                )}
                {item.body_fat && (
                  <Text style={styles.stat}>🔥 {item.body_fat}%</Text>
                )}
              </View>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.score}>{item.total_score}</Text>
              <Text style={styles.scoreSub}>分</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>還沒有人回報今日數據，快去輸入！</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  title: { fontSize: 22, fontWeight: "bold", color: "#f8fafc", marginTop: 8 },
  subtitle: { color: "#64748b", marginBottom: 16 },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1e293b", borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  cardFirst: { borderColor: "#eab308", borderWidth: 1.5 },
  rank: { fontSize: 24, width: 40 },
  info: { flex: 1 },
  username: { color: "#f8fafc", fontWeight: "bold", fontSize: 16 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  stat: { color: "#94a3b8", fontSize: 12 },
  scoreBox: { alignItems: "center" },
  score: { color: "#6366f1", fontWeight: "bold", fontSize: 18 },
  scoreSub: { color: "#475569", fontSize: 11 },
  empty: { color: "#64748b", textAlign: "center", marginTop: 40, fontSize: 15 },
});
