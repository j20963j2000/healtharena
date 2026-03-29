import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
} from "react-native";
import { joinArena } from "../lib/api";

export default function JoinArenaScreen({ navigation }: any) {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("錯誤", "請輸入邀請碼");
      return;
    }
    setLoading(true);
    try {
      const arena = await joinArena(inviteCode.trim().toUpperCase());
      if (arena.detail) throw new Error(arena.detail);
      Alert.alert("成功", `已加入「${arena.name}」！`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("錯誤", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>加入競技場</Text>
      <Text style={styles.subtitle}>輸入朋友給你的邀請碼</Text>

      <TextInput
        style={styles.input}
        placeholder="邀請碼（例：AB3X9KQ2）"
        placeholderTextColor="#64748b"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        maxLength={8}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleJoin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "加入中..." : "加入競技場"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "bold", color: "#f8fafc", marginBottom: 8 },
  subtitle: { color: "#64748b", fontSize: 15, marginBottom: 32 },
  input: {
    backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: 12,
    padding: 14, fontSize: 20, textAlign: "center", letterSpacing: 4,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#6366f1", borderRadius: 12,
    padding: 16, alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
