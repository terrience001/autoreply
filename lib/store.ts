import type { Room, QueueEntry } from './types';

type Store = {
  queue: QueueEntry[];
  rooms: Map<string, Room>;
  userRoom: Map<string, string>;
  lastSeen: Map<string, number>;
};

const g = globalThis as unknown as { __chatStore?: Store };

function getStore(): Store {
  if (!g.__chatStore) {
    g.__chatStore = {
      queue: [],
      rooms: new Map(),
      userRoom: new Map(),
      lastSeen: new Map(),
    };
  }
  return g.__chatStore;
}

export const store = {
  pushQueue(entry: QueueEntry) {
    const s = getStore();
    s.queue = s.queue.filter(e => e.userId !== entry.userId);
    s.queue.push(entry);
  },
  removeFromQueue(userId: string) {
    const s = getStore();
    s.queue = s.queue.filter(e => e.userId !== userId);
  },
  popOldestPartner(excludeUserId: string): QueueEntry | undefined {
    const s = getStore();
    const idx = s.queue.findIndex(e => e.userId !== excludeUserId);
    if (idx === -1) return undefined;
    const [picked] = s.queue.splice(idx, 1);
    return picked;
  },
  setRoom(room: Room) {
    getStore().rooms.set(room.id, room);
  },
  getRoom(roomId: string): Room | undefined {
    return getStore().rooms.get(roomId);
  },
  setUserRoom(userId: string, roomId: string) {
    getStore().userRoom.set(userId, roomId);
  },
  getUserRoom(userId: string): string | undefined {
    return getStore().userRoom.get(userId);
  },
  removeUserRoom(userId: string) {
    getStore().userRoom.delete(userId);
  },
  touch(userId: string) {
    getStore().lastSeen.set(userId, Date.now());
  },
  cleanupStale(maxAgeMs: number = 60_000) {
    const s = getStore();
    const now = Date.now();
    s.queue = s.queue.filter(e => {
      const last = s.lastSeen.get(e.userId) ?? e.joinedAt;
      return now - last < maxAgeMs;
    });
  },
};
