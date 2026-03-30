import { supabase } from "./supabase";

const API_BASE = process.env.EXPO_PUBLIC_API_URL!;

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "user-id": session?.user?.id ?? "",
    "bypass-tunnel-reminder": "true",  // for localtunnel
  };
}

export async function createArena(data: object) {
  const res = await fetch(`${API_BASE}/arenas/`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function joinArena(inviteCode: string) {
  const res = await fetch(`${API_BASE}/arenas/join/${inviteCode}`, {
    method: "POST",
    headers: await getHeaders(),
  });
  return res.json();
}

export async function getMyArenas() {
  const res = await fetch(`${API_BASE}/arenas/`, { headers: await getHeaders() });
  return res.json();
}

export async function getHealthData(params?: { start?: string; end?: string }) {
  const query = new URLSearchParams();
  if (params?.start) query.set("start", params.start);
  if (params?.end) query.set("end", params.end);
  const res = await fetch(`${API_BASE}/health/?${query}`, { headers: await getHeaders() });
  return res.json();
}

export async function upsertHealthData(data: object) {
  const res = await fetch(`${API_BASE}/health/`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getArenaReports(arenaId: string) {
  const res = await fetch(`${API_BASE}/reports/${arenaId}`, {
    headers: await getHeaders(),
  });
  return res.json();
}

export async function getLeaderboard(arenaId: string) {
  const res = await fetch(`${API_BASE}/leaderboard/${arenaId}`, {
    headers: await getHeaders(),
  });
  return res.json();
}

export async function searchUsers(q: string) {
  const res = await fetch(`${API_BASE}/friends/search?q=${encodeURIComponent(q)}`, {
    headers: await getHeaders(),
  });
  return res.json();
}

export async function getFriends() {
  const res = await fetch(`${API_BASE}/friends/`, { headers: await getHeaders() });
  return res.json();
}

export async function sendFriendRequest(addresseeId: string) {
  const res = await fetch(`${API_BASE}/friends/request/${addresseeId}`, {
    method: "POST",
    headers: await getHeaders(),
  });
  return res.json();
}

export async function acceptFriendRequest(friendshipId: string) {
  const res = await fetch(`${API_BASE}/friends/accept/${friendshipId}`, {
    method: "POST",
    headers: await getHeaders(),
  });
  return res.json();
}

export async function removeFriend(friendshipId: string) {
  const res = await fetch(`${API_BASE}/friends/${friendshipId}`, {
    method: "DELETE",
    headers: await getHeaders(),
  });
  return res.json();
}
