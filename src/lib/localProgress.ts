import { z } from "zod";

import type { ProgressMap } from "../types";

const GUEST_KEY = "yuwenke:guest-progress:v1";
const USER_PREFIX = "yuwenke:user-progress:v1:";
const OUTBOX_PREFIX = "yuwenke:user-outbox:v1:";

const entrySchema = z.object({
  cardId: z.string().regex(/^FC\d{3}$/),
  direction: z.enum(["hanzi-es", "es-hanzi"]),
  status: z.enum(["learning", "known"]),
  clientUpdatedAt: z.number().int().nonnegative(),
  serverUpdatedAt: z.number().int().nonnegative().nullable(),
  schemaVersion: z.literal(1),
});

interface StoredEnvelope {
  schemaVersion: 1;
  entries: ProgressMap;
}

export interface StorageResult<T> {
  value: T;
  available: boolean;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const marker = "__yuwenke_storage_test__";
    window.localStorage.setItem(marker, marker);
    window.localStorage.removeItem(marker);
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(key: string): StorageResult<ProgressMap> {
  const target = storage();
  if (!target) return { value: {}, available: false };

  try {
    const raw = target.getItem(key);
    if (!raw) return { value: {}, available: true };
    const envelope = JSON.parse(raw) as Partial<StoredEnvelope>;
    if (envelope.schemaVersion !== 1 || typeof envelope.entries !== "object") {
      return { value: {}, available: true };
    }

    const entries: ProgressMap = {};
    for (const [entryKey, candidate] of Object.entries(envelope.entries ?? {})) {
      const parsed = entrySchema.safeParse(candidate);
      const expectedKey = parsed.success
        ? `${parsed.data.cardId}::${parsed.data.direction}`
        : null;
      if (parsed.success && entryKey === expectedKey) entries[entryKey] = parsed.data;
    }
    return { value: entries, available: true };
  } catch {
    return { value: {}, available: true };
  }
}

function write(key: string, entries: ProgressMap): boolean {
  const target = storage();
  if (!target) return false;
  try {
    const envelope: StoredEnvelope = { schemaVersion: 1, entries };
    target.setItem(key, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

function remove(key: string): boolean {
  const target = storage();
  if (!target) return false;
  try {
    target.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export const localProgress = {
  readGuest: () => read(GUEST_KEY),
  writeGuest: (entries: ProgressMap) => write(GUEST_KEY, entries),
  clearGuest: () => remove(GUEST_KEY),
  readUser: (uid: string) => read(`${USER_PREFIX}${uid}`),
  writeUser: (uid: string, entries: ProgressMap) => write(`${USER_PREFIX}${uid}`, entries),
  clearUser: (uid: string) => remove(`${USER_PREFIX}${uid}`),
  readOutbox: (uid: string) => read(`${OUTBOX_PREFIX}${uid}`),
  writeOutbox: (uid: string, entries: ProgressMap) => write(`${OUTBOX_PREFIX}${uid}`, entries),
  clearOutbox: (uid: string) => remove(`${OUTBOX_PREFIX}${uid}`),
};
