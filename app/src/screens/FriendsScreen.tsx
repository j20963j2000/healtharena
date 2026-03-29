import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Alert, ActivityIndicator, Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getFriends, searchUsers, sendFriendRequest, acceptFriendRequest, removeFriend } from "../lib/api";

interface Friend {
  friendship_id: string;
  id: string;
  username: string;
  avatar_url?: string;
  status: "pending" | "accepted";
  is_requester: boolean;
}

interface SearchResult {
  id: string;
  username: string;
  avatar_url?: string;
}

function Avatar({ uri, name, size = 44 }: { uri?: string; name: string; size?: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  return uri ? (
    <Image source={{ uri }} style={style} />
  ) : (
    <View style={[style, { backgroundColor: "#6366f1", justifyContent: "center", alignItems: "center" }]}>
      <Text style={{ color: "#fff", fontWeight: "bold", fontSize: size * 0.4 }}>
        {name[0].toUpperCase()}
      </Text>
    </View>
  );
}

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await getFriends();
    setFriends(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    const data = await searchUsers(searchQ.trim());
    setSearchResults(Array.isArray(data) ? data : []);
    setSearching(false);
  };

  const handleSendRequest = async (userId: string, username: string) => {
    const res = await sendFriendRequest(userId);
    if (res.detail) {
      Alert.alert("提示", res.detail);
    } else {
      Alert.alert("已送出", `好友邀請已送給 ${username}！`);
      setSearchResults([]);
      setSearchQ("");
    }
  };

  const handleAccept = async (friendshipId: string, username: string) => {
    await acceptFriendRequest(friendshipId);
    Alert.alert("成功", `已接受 ${username} 的好友邀請！`);
    load();
  };

  const handleRemove = (friendshipId: string, username: string) => {
    Alert.alert("確認", `要移除 ${username} 嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "移除", style: "destructive",
        onPress: async () => { await removeFriend(friendshipId); load(); },
      },
    ]);
  };

  const pending = friends.filter(f => f.status === "pending" && !f.is_requester);
  const accepted = friends.filter(f => f.status === "accepted");
  const sent = friends.filter(f => f.status === "pending" && f.is_requester);

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜尋用戶名稱..."
          placeholderTextColor="#475569"
          value={searchQ}
          onChangeText={setSearchQ}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>{searching ? "⏳" : "🔍"}</Text>
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>搜尋結果</Text>
          {searchResults.map(u => (
            <View key={u.id} style={styles.row}>
              <Avatar uri={u.avatar_url} name={u.username} />
              <Text style={styles.username}>{u.username}</Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleSendRequest(u.id, u.username)}
              >
                <Text style={styles.actionBtnText}>+ 加好友</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {loading ? <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* Pending requests */}
              {pending.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>待接受的邀請 🔔</Text>
                  {pending.map(f => (
                    <View key={f.friendship_id} style={styles.row}>
                      <Avatar uri={f.avatar_url} name={f.username} />
                      <Text style={styles.username}>{f.username}</Text>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleAccept(f.friendship_id, f.username)}
                      >
                        <Text style={styles.actionBtnText}>接受</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Friends */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>好友 ({accepted.length})</Text>
                {accepted.length === 0 ? (
                  <Text style={styles.empty}>還沒有好友，搜尋用戶加好友吧！</Text>
                ) : accepted.map(f => (
                  <View key={f.friendship_id} style={styles.row}>
                    <Avatar uri={f.avatar_url} name={f.username} />
                    <Text style={styles.username}>{f.username}</Text>
                    <TouchableOpacity onPress={() => handleRemove(f.friendship_id, f.username)}>
                      <Text style={styles.removeBtn}>移除</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Sent requests */}
              {sent.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>已送出邀請</Text>
                  {sent.map(f => (
                    <View key={f.friendship_id} style={styles.row}>
                      <Avatar uri={f.avatar_url} name={f.username} />
                      <Text style={styles.username}>{f.username}</Text>
                      <Text style={styles.pendingText}>等待中...</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  searchBar: {
    flexDirection: "row", padding: 12,
    backgroundColor: "#1e293b", borderBottomWidth: 1, borderBottomColor: "#334155",
  },
  searchInput: {
    flex: 1, backgroundColor: "#0f172a", color: "#f8fafc",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
  },
  searchBtn: {
    backgroundColor: "#6366f1", borderRadius: 20,
    paddingHorizontal: 14, justifyContent: "center",
  },
  searchBtnText: { fontSize: 18 },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  sectionTitle: {
    color: "#64748b", fontSize: 12, fontWeight: "bold",
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 12,
  },
  row: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1e293b", borderRadius: 12,
    padding: 12, marginBottom: 8,
  },
  username: { flex: 1, color: "#f8fafc", fontWeight: "bold", marginLeft: 12 },
  actionBtn: { backgroundColor: "#6366f1", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  actionBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  removeBtn: { color: "#ef4444", fontSize: 13 },
  pendingText: { color: "#64748b", fontSize: 13 },
  empty: { color: "#475569", textAlign: "center", marginTop: 8 },
});
