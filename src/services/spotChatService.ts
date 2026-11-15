import { SpotChatMessage } from '../types/maritime';

const CHAT_STORAGE_KEY = 'wmg_spot_chats_v1';

function getSeedMessages(marinaId: string, city: string, marinaName: string): SpotChatMessage[] {
  return [
    {
      id: `${marinaId}-msg-1`,
      marinaId,
      author: 'Capt.Kerem',
      role: 'Harbor Crew',
      text: `Approach channel at ${marinaName} is clear today. Afternoon thermal NW breeze usually picks up after 13:30 local.`,
      timestamp: 'Today 09:40',
    },
    {
      id: `${marinaId}-msg-2`,
      marinaId,
      author: 'EgeKiter',
      role: 'Kiter',
      text: `Flat water inside the cove in ${city}. Using 10m-12m kite on steady thermal wind right now.`,
      timestamp: 'Today 11:15',
    },
  ];
}

export function loadSpotChat(marinaId: string, city: string, marinaName: string): SpotChatMessage[] {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return getSeedMessages(marinaId, city, marinaName);
    const map = JSON.parse(raw) as Record<string, SpotChatMessage[]>;
    return map[marinaId] && map[marinaId].length > 0
      ? map[marinaId]
      : getSeedMessages(marinaId, city, marinaName);
  } catch {
    return getSeedMessages(marinaId, city, marinaName);
  }
}

export function postSpotChatMessage(
  marinaId: string,
  city: string,
  marinaName: string,
  author: string,
  role: SpotChatMessage['role'],
  text: string,
): SpotChatMessage[] {
  const existing = loadSpotChat(marinaId, city, marinaName);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const msg: SpotChatMessage = {
    id: `msg-${Date.now().toString(36)}`,
    marinaId,
    author: author.trim() || 'Guest Sailor',
    role,
    text: text.trim(),
    timestamp: `Today ${timeStr}`,
  };
  const updated = [...existing, msg];

  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    const map: Record<string, SpotChatMessage[]> = raw ? JSON.parse(raw) : {};
    map[marinaId] = updated;
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota limits
  }

  return updated;
}
