import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, FlatList, Image, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { sharePhoto } from "../lib/share";

interface CheckIn {
  id: string;
  user_id: string;
  photo_url?: string;
  caption?: string;
  created_at: string;
  profiles?: { username: string; avatar_url?: string };
}

export default function CheckInScreen({ route }: any) {
  const { arenaId } = route.params ?? {};
  const { user } = useAuthStore();
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("checkins")
      .select("*, profiles(username, avatar_url)")
      .eq("arena_id", arenaId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) console.error("checkins load error:", error);
    console.log("checkins data:", data);
    setCheckins(data ?? []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleCheckIn = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("需要相機權限", "請在設定中允許使用相機");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets[0].base64 || !user) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop() ?? "jpg";
      const filename = `${user.id}/${Date.now()}.${ext}`;

      const binary = atob(asset.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const { error: uploadError } = await supabase.storage
        .from("checkins")
        .upload(filename, bytes, { contentType: `image/${ext}`, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("checkins").getPublicUrl(filename);

      await supabase.from("checkins").insert({
        user_id: user.id,
        arena_id: arenaId,
        photo_url: urlData.publicUrl,
        caption: caption.trim() || null,
      });

      setCaption("");
      await load();
      Alert.alert("打卡成功！", "已成功記錄今日打卡 💪");
    } catch (e: any) {
      Alert.alert("失敗", e.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets[0].base64 || !user) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop() ?? "jpg";
      const filename = `${user.id}/${Date.now()}.${ext}`;

      const binary = atob(asset.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const { error: uploadError } = await supabase.storage
        .from("checkins")
        .upload(filename, bytes, { contentType: `image/${ext}`, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("checkins").getPublicUrl(filename);

      await supabase.from("checkins").insert({
        user_id: user.id,
        arena_id: arenaId,
        photo_url: urlData.publicUrl,
        caption: caption.trim() || null,
      });

      setCaption("");
      await load();
    } catch (e: any) {
      Alert.alert("失敗", e.message);
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item }: { item: CheckIn }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          {item.profiles?.avatar_url ? (
            <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {(item.profiles?.username ?? "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.username}>{item.profiles?.username ?? "用戶"}</Text>
            <Text style={styles.time}>
              {new Date(item.created_at).toLocaleString("zh-TW", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      </View>
      {item.photo_url && (
        <Image source={{ uri: item.photo_url }} style={styles.photo} resizeMode="cover" />
      )}
      {item.caption && <Text style={styles.caption}>{item.caption}</Text>}
      {item.photo_url && (
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => sharePhoto(item.photo_url!, item.caption ?? undefined)}
        >
          <Text style={styles.shareBtnText}>📤 分享</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.captionInput}
          placeholder="說點什麼..."
          placeholderTextColor="#475569"
          value={caption}
          onChangeText={setCaption}
        />
        <TouchableOpacity style={styles.iconBtn} onPress={handlePickFromLibrary} disabled={uploading}>
          <Text style={styles.iconBtnText}>🖼️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkInBtn} onPress={handleCheckIn} disabled={uploading}>
          <Text style={styles.checkInText}>{uploading ? "⏳" : "📸"}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={checkins}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📷</Text>
              <Text style={styles.emptyText}>還沒有人打卡</Text>
              <Text style={styles.emptySub}>按右上角相機開始打卡！</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  inputBar: {
    flexDirection: "row", alignItems: "center",
    padding: 12, backgroundColor: "#1e293b",
    borderBottomWidth: 1, borderBottomColor: "#334155",
  },
  captionInput: {
    flex: 1, color: "#f8fafc", fontSize: 15,
    backgroundColor: "#0f172a", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
  },
  iconBtn: { padding: 8 },
  iconBtnText: { fontSize: 22 },
  checkInBtn: {
    backgroundColor: "#6366f1", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  checkInText: { fontSize: 22 },
  list: { padding: 12 },
  card: {
    backgroundColor: "#1e293b", borderRadius: 16, marginBottom: 12, overflow: "hidden",
  },
  cardHeader: { padding: 12 },
  userInfo: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  avatarFallback: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#6366f1", justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  avatarText: { color: "#fff", fontWeight: "bold" },
  username: { color: "#f8fafc", fontWeight: "bold" },
  time: { color: "#64748b", fontSize: 12 },
  photo: { width: "100%", aspectRatio: 4 / 3 },
  caption: { color: "#cbd5e1", padding: 12, fontSize: 15 },
  empty: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#f8fafc", fontSize: 18, fontWeight: "bold" },
  emptySub: { color: "#64748b", marginTop: 4 },
  shareBtn: { padding: 10, alignItems: "flex-end" },
  shareBtnText: { color: "#6366f1", fontSize: 13, fontWeight: "bold" },
});
