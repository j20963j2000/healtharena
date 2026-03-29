import { Share } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

export async function shareText(message: string) {
  await Share.share({ message });
}

export async function shareArenaInvite(arenaName: string, inviteCode: string) {
  await Share.share({
    message: `⚔️ 來加入健康競技場「${arenaName}」！\n邀請碼：${inviteCode}\n下載 HealthArena 開始比拚！`,
    title: `加入「${arenaName}」`,
  });
}

export async function shareLeaderboard(arenaName: string, rank: number, score: number, total: number) {
  const medals = ["🥇", "🥈", "🥉"];
  const medal = rank <= 3 ? medals[rank - 1] : `#${rank}`;
  await Share.share({
    message: `${medal} 我在「${arenaName}」健康競技場排名第 ${rank} / ${total} 名！\n總積分：${score} 分\n快來跟我比拚健康！⚔️`,
    title: "HealthArena 戰績",
  });
}

export async function sharePhoto(photoUrl: string, caption?: string) {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    await Share.share({ message: caption ?? "打卡照片" });
    return;
  }

  // Download photo to local cache first
  const filename = `${FileSystem.cacheDirectory}checkin_${Date.now()}.jpg`;
  const { uri } = await FileSystem.downloadAsync(photoUrl, filename);
  await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle: caption ?? "打卡照片" });
}
