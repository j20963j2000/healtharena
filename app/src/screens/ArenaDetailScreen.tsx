import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { shareArenaInvite } from "../lib/share";
import { deleteArena } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function ArenaDetailScreen({ route, navigation }: any) {
  const { arena } = route.params;
  const { user } = useAuthStore();
  const [deleting, setDeleting] = useState(false);

  const isCreator = user?.id === arena.creator_id;

  const shareInviteCode = () => shareArenaInvite(arena.name, arena.invite_code);

  const handleDelete = () => {
    Alert.alert(
      "刪除競技場",
      `確定要刪除「${arena.name}」？\n所有成員資料與戰報都將一併刪除，此操作無法復原。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "刪除",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteArena(arena.id);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert("刪除失敗", e.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{arena.name}</Text>
      {arena.description && (
        <Text style={styles.description}>{arena.description}</Text>
      )}

      <View style={styles.infoCard}>
        <Row label="創建者" value={arena.creator_name ?? "—"} />
        <Row label="狀態" value={
          arena.status === "active" ? "🔥 進行中" :
          arena.status === "pending" ? "⏳ 等待開始" : "✅ 已結束"
        } />
        <Row label="賽期" value={`${arena.start_date} → ${arena.end_date}`} />
        <Row label="🏆 獎勵" value={arena.reward_winner} />
        <Row label="😈 懲罰" value={arena.penalty_loser} />
        <Row label="邀請碼" value={arena.invite_code} highlight />
      </View>

      <TouchableOpacity style={styles.shareButton} onPress={shareInviteCode}>
        <Text style={styles.shareButtonText}>📤 分享邀請碼</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("Leaderboard", {
            arenaId: arena.id,
            arenaName: arena.name,
          })}
        >
          <Text style={styles.actionIcon}>🏆</Text>
          <Text style={styles.actionLabel}>排行榜</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("Report", { arenaId: arena.id })}
        >
          <Text style={styles.actionIcon}>📰</Text>
          <Text style={styles.actionLabel}>AI 戰報</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("CheckIn", { arenaId: arena.id })}
        >
          <Text style={styles.actionIcon}>📸</Text>
          <Text style={styles.actionLabel}>打卡牆</Text>
        </TouchableOpacity>
      </View>

      {isCreator && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting
            ? <ActivityIndicator color="#ef4444" />
            : <Text style={styles.deleteButtonText}>🗑️ 刪除競技場</Text>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, highlight && rowStyles.highlight]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#334155" },
  label: { color: "#64748b", fontSize: 14 },
  value: { color: "#f8fafc", fontSize: 14, fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  highlight: { color: "#6366f1", fontWeight: "bold", letterSpacing: 2, fontSize: 16 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  name: { fontSize: 26, fontWeight: "bold", color: "#f8fafc", marginTop: 8, marginBottom: 4 },
  description: { color: "#64748b", marginBottom: 16 },
  infoCard: { backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 16 },
  shareButton: {
    backgroundColor: "#1e293b", borderRadius: 12, borderWidth: 1,
    borderColor: "#6366f1", padding: 14, alignItems: "center", marginBottom: 20,
  },
  shareButtonText: { color: "#6366f1", fontWeight: "bold", fontSize: 15 },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1, backgroundColor: "#1e293b", borderRadius: 16,
    padding: 20, alignItems: "center",
  },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionLabel: { color: "#94a3b8", fontWeight: "bold" },
  deleteButton: {
    marginTop: 24, borderRadius: 12, borderWidth: 1,
    borderColor: "#ef4444", padding: 14, alignItems: "center",
  },
  deleteButtonText: { color: "#ef4444", fontWeight: "bold", fontSize: 15 },
});
