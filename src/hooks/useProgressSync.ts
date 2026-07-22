import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

import type {
  ProgressEntry,
  ProgressMap,
  ProgressStatus,
  StudyDirection,
} from "../types";
import { isFirebaseConfigured } from "../lib/firebaseConfig";
import { localProgress } from "../lib/localProgress";
import {
  mergeLocalProgress,
  mergeProgress,
  nextClientTimestamp,
  unitKey,
} from "../lib/study";

type FirebaseClientModule = typeof import("../lib/firebaseClient");

let loadedFirebaseClient: FirebaseClientModule | null = null;
let firebaseClientPromise: Promise<FirebaseClientModule> | null = null;

function loadFirebaseClient(): Promise<FirebaseClientModule> {
  if (loadedFirebaseClient) return Promise.resolve(loadedFirebaseClient);
  firebaseClientPromise ??= import("../lib/firebaseClient").then((client) => {
    loadedFirebaseClient = client;
    return client;
  });
  return firebaseClientPromise;
}

export type SyncState =
  | "local"
  | "syncing"
  | "synced"
  | "offline"
  | "error";

interface UseProgressSyncResult {
  progress: ProgressMap;
  ready: boolean;
  storageAvailable: boolean;
  user: User | null;
  syncState: SyncState;
  firebaseConfigured: boolean;
  firebaseReady: boolean;
  notice: string;
  setStatus: (
    cardId: string,
    direction: StudyDirection,
    status: ProgressStatus,
  ) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => Promise<void>;
  clearNotice: () => void;
}

function withoutAcknowledged(outbox: ProgressMap, cloud: ProgressMap): ProgressMap {
  const pending: ProgressMap = {};
  for (const [key, entry] of Object.entries(outbox)) {
    if (!cloud[key] || cloud[key].clientUpdatedAt < entry.clientUpdatedAt) {
      pending[key] = entry;
    }
  }
  return pending;
}

export function useProgressSync(): UseProgressSyncResult {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("local");
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [notice, setNotice] = useState("");

  const progressRef = useRef<ProgressMap>({});
  const userRef = useRef<User | null>(null);
  const generationRef = useRef(0);
  const unsubscribeCloudRef = useRef<(() => void) | null>(null);
  const flushingRef = useRef(false);

  const replaceProgress = useCallback((next: ProgressMap) => {
    progressRef.current = next;
    setProgress(next);
  }, []);

  const flushOutbox = useCallback(async (uid: string, generation: number) => {
    if (flushingRef.current || generation !== generationRef.current) return;
    const pending = localProgress.readOutbox(uid).value;
    if (Object.keys(pending).length === 0) {
      setSyncState("synced");
      return;
    }

    flushingRef.current = true;
    setSyncState("syncing");
    try {
      const firebase = await loadFirebaseClient();
      await firebase.writeCloudProgressBatch(uid, pending);
      if (generation !== generationRef.current || userRef.current?.uid !== uid) return;
      const latest = localProgress.readOutbox(uid).value;
      const remaining: ProgressMap = {};
      for (const [key, entry] of Object.entries(latest)) {
        if (pending[key]?.clientUpdatedAt !== entry.clientUpdatedAt) remaining[key] = entry;
      }
      if (Object.keys(remaining).length > 0) localProgress.writeOutbox(uid, remaining);
      else localProgress.clearOutbox(uid);
      localProgress.clearGuest();
      setSyncState(Object.keys(remaining).length > 0 ? "syncing" : "synced");
      setNotice("Progreso sincronizado.");
    } catch {
      if (generation === generationRef.current) {
        setSyncState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
        setNotice("Guardaremos este cambio cuando vuelva la conexión.");
      }
    } finally {
      flushingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const guest = localProgress.readGuest();
    replaceProgress(guest.value);
    setStorageAvailable(guest.available);
    setReady(true);

    if (!isFirebaseConfigured) return undefined;

    let cancelled = false;
    let unsubscribeAuth: () => void = () => undefined;
    void loadFirebaseClient().then((firebase) => {
      if (cancelled) return;
      setFirebaseReady(true);
      unsubscribeAuth = firebase.observeAuth(
      (nextUser) => {
        const generation = generationRef.current + 1;
        generationRef.current = generation;
        unsubscribeCloudRef.current?.();
        unsubscribeCloudRef.current = null;
        userRef.current = nextUser;
        setUser(nextUser);

        if (!nextUser) {
          const nextGuest = localProgress.readGuest();
          replaceProgress(nextGuest.value);
          setStorageAvailable(nextGuest.available);
          setSyncState("local");
          return;
        }

        const guestProgress = localProgress.readGuest().value;
        const userProgress = localProgress.readUser(nextUser.uid).value;
        const existingOutbox = localProgress.readOutbox(nextUser.uid).value;
        const local = mergeLocalProgress(guestProgress, userProgress, existingOutbox);
        const migrationOutbox = mergeLocalProgress(existingOutbox, guestProgress);
        if (Object.keys(migrationOutbox).length > 0) {
          localProgress.writeOutbox(nextUser.uid, migrationOutbox);
        }
        replaceProgress(local);
        localProgress.writeUser(nextUser.uid, local);
        setSyncState("syncing");

        unsubscribeCloudRef.current = firebase.observeCloudProgress(
          nextUser.uid,
          (cloud, serverConfirmed, pendingWrites) => {
            if (generation !== generationRef.current || userRef.current?.uid !== nextUser.uid) return;
            const currentOutbox = localProgress.readOutbox(nextUser.uid).value;
            const localState = mergeLocalProgress(progressRef.current, currentOutbox);
            const { merged, localWinners } = mergeProgress(localState, cloud);
            replaceProgress(merged);
            localProgress.writeUser(nextUser.uid, merged);

            const serverHasAcknowledged = serverConfirmed && !pendingWrites;
            const remaining = serverHasAcknowledged
              ? withoutAcknowledged(currentOutbox, cloud)
              : currentOutbox;
            if (Object.keys(remaining).length > 0) localProgress.writeOutbox(nextUser.uid, remaining);
            else localProgress.clearOutbox(nextUser.uid);

            const uploads = mergeLocalProgress(remaining, localWinners);
            if (serverHasAcknowledged) {
              if (Object.keys(uploads).length > 0) {
                localProgress.writeOutbox(nextUser.uid, uploads);
                void flushOutbox(nextUser.uid, generation);
              } else {
                localProgress.clearGuest();
                setSyncState("synced");
              }
            }
          },
          () => {
            if (generation === generationRef.current) {
              setSyncState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
            }
          },
        );
      },
      () => {
        setSyncState("error");
        setNotice("No se pudo iniciar la sincronización. Tu progreso local sigue a salvo.");
      },
      );
    }).catch(() => {
      if (!cancelled) {
        setSyncState("error");
        setNotice("No se pudo preparar la sincronización. Tu progreso local sigue a salvo.");
      }
    });

    const handleOnline = () => {
      const currentUser = userRef.current;
      if (currentUser) void flushOutbox(currentUser.uid, generationRef.current);
    };
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      generationRef.current += 1;
      unsubscribeCloudRef.current?.();
      unsubscribeAuth();
      window.removeEventListener("online", handleOnline);
    };
  }, [flushOutbox, replaceProgress]);

  const setStatus = useCallback(
    (cardId: string, direction: StudyDirection, status: ProgressStatus) => {
      const key = unitKey(cardId, direction);
      const entry: ProgressEntry = {
        cardId,
        direction,
        status,
        clientUpdatedAt: nextClientTimestamp(progressRef.current[key]),
        serverUpdatedAt: null,
        schemaVersion: 1,
      };
      const next = { ...progressRef.current, [key]: entry };
      replaceProgress(next);

      const currentUser = userRef.current;
      if (!currentUser) {
        if (!localProgress.writeGuest(next)) setStorageAvailable(false);
        return;
      }

      localProgress.writeUser(currentUser.uid, next);
      const outbox = { ...localProgress.readOutbox(currentUser.uid).value, [key]: entry };
      localProgress.writeOutbox(currentUser.uid, outbox);
      setSyncState("syncing");
      const generation = generationRef.current;
      void loadFirebaseClient()
        .then((firebase) => firebase.writeCloudProgress(currentUser.uid, entry))
        .then(() => {
          if (generation !== generationRef.current || userRef.current?.uid !== currentUser.uid) return;
          const latest = localProgress.readOutbox(currentUser.uid).value;
          if (latest[key]?.clientUpdatedAt === entry.clientUpdatedAt) {
            delete latest[key];
            if (Object.keys(latest).length > 0) localProgress.writeOutbox(currentUser.uid, latest);
            else localProgress.clearOutbox(currentUser.uid);
          }
          setSyncState(Object.keys(latest).length > 0 ? "syncing" : "synced");
        })
        .catch(() => {
          if (generation === generationRef.current) {
            setSyncState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
            setNotice("Guardaremos este cambio cuando vuelva la conexión.");
          }
        });
    },
    [replaceProgress],
  );

  const signIn = useCallback(async () => {
    setNotice("");
    if (!loadedFirebaseClient) {
      setNotice("La sincronización se está preparando. Inténtalo de nuevo en un momento.");
      return;
    }
    try {
      await loadedFirebaseClient.signInWithGoogle();
    } catch {
      setNotice("No se pudo iniciar sesión. Tu progreso local sigue a salvo.");
    }
  }, []);

  const signOut = useCallback(async () => {
    const currentUser = userRef.current;
    generationRef.current += 1;
    unsubscribeCloudRef.current?.();
    unsubscribeCloudRef.current = null;
    if (currentUser) localProgress.clearUser(currentUser.uid);
    localProgress.clearGuest();
    userRef.current = null;
    setUser(null);
    replaceProgress({});
    setSyncState("local");
    try {
      if (loadedFirebaseClient) await loadedFirebaseClient.signOutFromFirebase();
    } catch {
      // Local account state has already been isolated from the fresh guest session.
    } finally {
      setNotice("Sesión cerrada. Ahora estudias como invitado.");
    }
  }, [replaceProgress]);

  const retry = useCallback(async () => {
    const currentUser = userRef.current;
    if (currentUser) await flushOutbox(currentUser.uid, generationRef.current);
  }, [flushOutbox]);

  const clearNotice = useCallback(() => setNotice(""), []);

  return {
    progress,
    ready,
    storageAvailable,
    user,
    syncState,
    firebaseConfigured: isFirebaseConfigured,
    firebaseReady,
    notice,
    setStatus,
    signIn,
    signOut,
    retry,
    clearNotice,
  };
}
