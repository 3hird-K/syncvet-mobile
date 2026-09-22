import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ServiceTransaction } from '@services/data';

interface NotificationState {
  readIds: string[];
  loaded: boolean;
  loadReadIds: (ownerId: string) => Promise<void>;
  markAsRead: (ownerId: string, id: string) => Promise<void>;
  markAllAsRead: (ownerId: string, ids: string[]) => Promise<void>;
  getUnreadCount: (transactions: ServiceTransaction[]) => number;
}

function storageKey(ownerId: string): string {
  return `syncvet.notifications.read.${ownerId || 'default'}`;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  readIds: [],
  loaded: false,

  loadReadIds: async (ownerId: string) => {
    if (!ownerId) return;
    try {
      const raw = await AsyncStorage.getItem(storageKey(ownerId));
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ readIds: Array.isArray(parsed) ? parsed : [], loaded: true });
        return;
      }
    } catch {}
    set({ readIds: [], loaded: true });
  },

  markAsRead: async (ownerId: string, id: string) => {
    if (!id) return;
    const current = get().readIds;
    if (current.includes(id)) return;

    const updated = [...current, id];
    set({ readIds: updated });
    try {
      await AsyncStorage.setItem(storageKey(ownerId), JSON.stringify(updated));
    } catch {}
  },

  markAllAsRead: async (ownerId: string, ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const current = get().readIds;
    const combined = Array.from(new Set([...current, ...ids]));
    if (combined.length === current.length) return;

    set({ readIds: combined });
    try {
      await AsyncStorage.setItem(storageKey(ownerId), JSON.stringify(combined));
    } catch {}
  },

  getUnreadCount: (transactions: ServiceTransaction[]) => {
    const { readIds } = get();
    if (!transactions || transactions.length === 0) return 0;
    const readSet = new Set(readIds);
    return transactions.filter((t) => {
      const id = t.id || t.transactionNo;
      return !readSet.has(id);
    }).length;
  },
}));
