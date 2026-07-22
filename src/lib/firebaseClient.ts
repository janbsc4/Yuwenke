import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import {
  collection,
  doc,
  initializeFirestore,
  memoryLocalCache,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  waitForPendingWrites,
  writeBatch,
  type Firestore,
  type QuerySnapshot,
} from "firebase/firestore";

import type { ProgressEntry, ProgressMap } from "../types";
import { firebaseConfig, isFirebaseConfigured } from "./firebaseConfig";
import { progressDocumentId, unitKey } from "./study";

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let cachedServices: FirebaseServices | null = null;

export function getFirebaseServices(): FirebaseServices | null {
  if (!isFirebaseConfigured || typeof window === "undefined") return null;
  if (cachedServices) return cachedServices;

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  void setPersistence(auth, browserLocalPersistence).catch(() => undefined);
  cachedServices = { app, auth, db };
  return cachedServices;
}

export function observeAuth(
  onUser: (user: User | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) return () => undefined;
  return onAuthStateChanged(services.auth, onUser, onError);
}

export async function signInWithGoogle(): Promise<User> {
  const services = getFirebaseServices();
  if (!services) throw new Error("Firebase no está configurado.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(services.auth, provider);
  return credential.user;
}

export async function signOutFromFirebase(): Promise<void> {
  const services = getFirebaseServices();
  if (services) await signOut(services.auth);
}

function progressCollection(db: Firestore, uid: string) {
  return collection(db, "users", uid, "progress");
}

function progressDoc(db: Firestore, uid: string, entry: ProgressEntry) {
  return doc(
    db,
    "users",
    uid,
    "progress",
    progressDocumentId(entry.cardId, entry.direction),
  );
}

function firestoreData(entry: ProgressEntry) {
  return {
    cardId: entry.cardId,
    direction: entry.direction,
    status: entry.status,
    clientUpdatedAt: Timestamp.fromMillis(entry.clientUpdatedAt),
    serverUpdatedAt: serverTimestamp(),
    schemaVersion: 1,
  };
}

function timestampMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

export function snapshotProgress(snapshot: QuerySnapshot): ProgressMap {
  const progress: ProgressMap = {};
  for (const document of snapshot.docs) {
    const data = document.data();
    const clientUpdatedAt = timestampMillis(data.clientUpdatedAt);
    if (
      typeof data.cardId !== "string" ||
      (data.direction !== "hanzi-es" && data.direction !== "es-hanzi") ||
      (data.status !== "learning" && data.status !== "known") ||
      clientUpdatedAt === null ||
      data.schemaVersion !== 1
    ) {
      continue;
    }

    const entry: ProgressEntry = {
      cardId: data.cardId,
      direction: data.direction,
      status: data.status,
      clientUpdatedAt,
      serverUpdatedAt: timestampMillis(data.serverUpdatedAt),
      schemaVersion: 1,
    };
    progress[unitKey(entry.cardId, entry.direction)] = entry;
  }
  return progress;
}

export function observeCloudProgress(
  uid: string,
  onProgress: (progress: ProgressMap, serverConfirmed: boolean, pending: boolean) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) return () => undefined;

  return onSnapshot(
    progressCollection(services.db, uid),
    { includeMetadataChanges: true },
    (snapshot) =>
      onProgress(
        snapshotProgress(snapshot),
        !snapshot.metadata.fromCache,
        snapshot.metadata.hasPendingWrites,
      ),
    onError,
  );
}

export async function writeCloudProgress(uid: string, entry: ProgressEntry): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error("Firebase no está configurado.");
  await setDoc(progressDoc(services.db, uid, entry), firestoreData(entry));
  await waitForPendingWrites(services.db);
}

export async function writeCloudProgressBatch(
  uid: string,
  progress: ProgressMap,
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error("Firebase no está configurado.");
  const entries = Object.values(progress);
  if (entries.length === 0) return;
  if (entries.length > 500) throw new Error("La sincronización supera el límite del lote.");

  const batch = writeBatch(services.db);
  for (const entry of entries) {
    batch.set(progressDoc(services.db, uid, entry), firestoreData(entry));
  }
  await batch.commit();
  await waitForPendingWrites(services.db);
}
