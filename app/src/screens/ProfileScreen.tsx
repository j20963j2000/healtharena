import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ScrollView, ActivityIndicator, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";

interface Profile {
  id: string;
  username: string;
  bio?: string;
  social_links?: {
    ig?: string;
    line?: string;
    fb?: string;
  };
}

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [ig, setIg] = useState("");
  const [line, setLine] = useState("");
  const [fb, setFb] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) {
      setProfile(data);
      setUsername(data.username ?? "");
      setBio(data.bio ?? "");
      setIg(data.social_links?.ig ?? "");
      setLine(data.social_links?.line ?? "");
      setFb(data.social_links?.fb ?? "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        bio,
        social_links: { ig, line, fb },
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      Alert.alert("錯誤", error.message);
    } else {
      setEditing(false);
      loadProfile();
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("需要相片權限", "請在設定中允許存取相片");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64 || !user) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, decode(asset.base64), {
          contentType: `image/${ext}`,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
      await loadProfile();
    } catch (e: any) {
      Alert.alert("上傳失敗", e.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  function decode(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  const handleSignOut = () => {
    Alert.alert("登出", "確定要登出嗎？", [
      { text: "取消", style: "cancel" },
      { text: "登出", style: "destructive", onPress: signOut },
    ]);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#6366f1" size="large" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.username ?? user?.email ?? "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>{uploadingAvatar ? "⏳" : "📷"}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Profile Info */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>個人資料</Text>
          <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
            <Text style={styles.editBtn}>{saving ? "儲存中..." : editing ? "儲存" : "編輯"}</Text>
          </TouchableOpacity>
        </View>

        <Field label="用戶名稱" value={username} onChangeText={setUsername} editing={editing} />
        <Field label="個人簡介" value={bio} onChangeText={setBio} editing={editing} placeholder="介紹一下自己..." />
      </View>

      {/* Social Links */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>社群帳號</Text>
        <Field label="📸 Instagram" value={ig} onChangeText={setIg} editing={editing} placeholder="@username" />
        <Field label="💬 LINE ID" value={line} onChangeText={setLine} editing={editing} placeholder="LINE ID" />
        <Field label="👤 Facebook" value={fb} onChangeText={setFb} editing={editing} placeholder="fb.com/username" />
        {!editing && (
          <Text style={styles.socialHint}>點「編輯」填入社群帳號</Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>帳號資訊</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{user?.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>加入時間</Text>
          <Text style={styles.rowValue}>
            {user?.created_at ? new Date(user.created_at).toLocaleDateString("zh-TW") : "—"}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>登出</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  label, value, onChangeText, editing, placeholder,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  editing: boolean; placeholder?: string;
}) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      {editing ? (
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor="#475569"
        />
      ) : (
        <Text style={fieldStyles.value}>{value || <Text style={fieldStyles.empty}>未設定</Text>}</Text>
      )}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  label: { color: "#64748b", fontSize: 12, marginBottom: 4 },
  input: { color: "#f8fafc", fontSize: 15, padding: 0 },
  value: { color: "#f8fafc", fontSize: 15 },
  empty: { color: "#334155" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  avatarContainer: { alignItems: "center", marginVertical: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#6366f1", justifyContent: "center", alignItems: "center",
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  avatarBadge: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: "#0f172a", borderRadius: 12, padding: 2,
  },
  avatarBadgeText: { fontSize: 16 },
  email: { color: "#64748b", fontSize: 14, marginTop: 8 },
  card: {
    backgroundColor: "#1e293b", borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { color: "#94a3b8", fontSize: 13, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 },
  editBtn: { color: "#6366f1", fontWeight: "bold", fontSize: 15 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0f172a" },
  rowLabel: { color: "#64748b", fontSize: 14 },
  rowValue: { color: "#f8fafc", fontSize: 14 },
  socialHint: { color: "#334155", fontSize: 12, marginTop: 8, textAlign: "center" },
  signOutBtn: {
    backgroundColor: "#1e293b", borderRadius: 12, borderWidth: 1,
    borderColor: "#ef4444", padding: 14, alignItems: "center", marginTop: 8,
  },
  signOutText: { color: "#ef4444", fontWeight: "bold", fontSize: 15 },
});
