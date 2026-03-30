import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const STORED_EMAIL_KEY = "stored_email";
const STORED_PASSWORD_KEY = "stored_password";

interface AuthState {
  user: User | null;
  loading: boolean;
  isBiometricEnabled: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  init: () => Promise<void>;
  enableBiometrics: (email: string, password: string) => Promise<void>;
  disableBiometrics: () => Promise<void>;
  biometricSignIn: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  isBiometricEnabled: false,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const biometricEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    set({
      user: session?.user ?? null,
      loading: false,
      isBiometricEnabled: biometricEnabled === "true",
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null });
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        username,
      });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  enableBiometrics: async (email, password) => {
    await SecureStore.setItemAsync(STORED_EMAIL_KEY, email);
    await SecureStore.setItemAsync(STORED_PASSWORD_KEY, password);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
    set({ isBiometricEnabled: true });
  },

  disableBiometrics: async () => {
    await SecureStore.deleteItemAsync(STORED_EMAIL_KEY);
    await SecureStore.deleteItemAsync(STORED_PASSWORD_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    set({ isBiometricEnabled: false });
  },

  biometricSignIn: async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) throw new Error("此裝置不支援生物辨識");

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) throw new Error("尚未設定 Face ID / Touch ID");

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "使用 Face ID 登入 HealthArena",
      cancelLabel: "取消",
      fallbackLabel: "使用密碼",
    });

    if (!result.success) throw new Error("驗證失敗");

    const email = await SecureStore.getItemAsync(STORED_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(STORED_PASSWORD_KEY);
    if (!email || !password) throw new Error("找不到已儲存的帳號資訊");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
}));
