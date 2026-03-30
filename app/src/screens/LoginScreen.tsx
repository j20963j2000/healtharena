import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuthStore } from "../store/authStore";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { signIn, signUp, biometricSignIn, enableBiometrics, isBiometricEnabled } = useAuthStore();

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    })();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, username);
        Alert.alert("成功", "帳號建立完成！請查收驗證信");
      } else {
        await signIn(email, password);
        if (biometricAvailable && !isBiometricEnabled) {
          Alert.alert(
            "啟用 Face ID 登入",
            "下次可以用 Face ID 快速登入，要啟用嗎？",
            [
              { text: "不用了", style: "cancel" },
              {
                text: "啟用",
                onPress: () => enableBiometrics(email, password),
              },
            ]
          );
        }
      }
    } catch (e: any) {
      Alert.alert("錯誤", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricSignIn = async () => {
    setLoading(true);
    try {
      await biometricSignIn();
    } catch (e: any) {
      Alert.alert("錯誤", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>⚔️ HealthArena</Text>
      <Text style={styles.subtitle}>健康競技場</Text>

      {isBiometricEnabled && biometricAvailable && !isSignUp && (
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleBiometricSignIn}
          disabled={loading}
        >
          <Text style={styles.biometricIcon}>🔐</Text>
          <Text style={styles.biometricText}>使用 Face ID 登入</Text>
        </TouchableOpacity>
      )}

      {isSignUp && (
        <TextInput
          style={styles.input}
          placeholder="用戶名稱"
          placeholderTextColor="#64748b"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="密碼"
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "處理中..." : isSignUp ? "註冊" : "登入"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={styles.switchText}>
          {isSignUp ? "已有帳號？登入" : "還沒帳號？註冊"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0f172a",
  },
  title: {
    fontSize: 36, fontWeight: "bold", color: "#f8fafc",
    textAlign: "center", marginBottom: 4,
  },
  subtitle: {
    fontSize: 16, color: "#94a3b8", textAlign: "center", marginBottom: 40,
  },
  biometricButton: {
    backgroundColor: "#1e293b", borderRadius: 12, borderWidth: 1,
    borderColor: "#6366f1", padding: 16, alignItems: "center",
    marginBottom: 20, flexDirection: "row", justifyContent: "center", gap: 10,
  },
  biometricIcon: { fontSize: 22 },
  biometricText: { color: "#6366f1", fontSize: 16, fontWeight: "600" },
  input: {
    backgroundColor: "#1e293b", color: "#f8fafc",
    borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16,
  },
  button: {
    backgroundColor: "#6366f1", borderRadius: 12,
    padding: 16, alignItems: "center", marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  switchText: {
    color: "#6366f1", textAlign: "center", marginTop: 16, fontSize: 14,
  },
});
