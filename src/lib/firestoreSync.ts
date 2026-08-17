import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  query,
  QueryConstraint
} from "firebase/firestore";
import { db } from "./firebase";
import { getEncryptedStorage, setEncryptedStorage } from "./encryption";

export interface SyncStatus {
  connected: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
}

/**
 * Remove all undefined properties recursively so Firestore setDoc does not throw
 */
function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeData) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = sanitizeData(value);
    }
  }
  return result as T;
}

/**
 * Subscribe to a Firestore collection with real-time updates.
 * Merges remote snapshot items with local cache so local edits/floors/seats are preserved even offline.
 *
 * IMPORTANT: fast-growing, log-style collections (auditLogs, checkInLogs, etc.) can
 * accumulate an unbounded number of documents on a shared/long-lived project. Pass
 * `queryConstraints` (e.g. [orderBy("timestamp", "desc"), limit(500)]) for those
 * collections so this never pulls the entire collection down on every client.
 */
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onUpdate: (items: T[]) => void,
  initialFallback?: T[],
  queryConstraints?: QueryConstraint[]
): () => void {
  const colRef = collection(db, collectionName);
  const queryRef = queryConstraints && queryConstraints.length > 0
    ? query(colRef, ...queryConstraints)
    : colRef;

  const getCachedStorage = (): T[] | null => {
    try {
      const parsed = getEncryptedStorage<T[] | null>(collectionName, null);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.error(`Failed to read enterprizseat_${collectionName} from encrypted storage`, e);
    }
    return null;
  };

  const unsubscribe = onSnapshot(
    queryRef,
    async (snapshot) => {
      const storageKey = `enterprizseat_has_seeded_${collectionName}`;
      const hasSeededBefore = typeof localStorage !== "undefined" && localStorage.getItem(storageKey) === "true";

      if (snapshot.empty) {
        if (!hasSeededBefore && initialFallback && initialFallback.length > 0) {
          console.log(`[Firestore Sync] First-time seeding empty collection: ${collectionName}`);
          try {
            if (typeof localStorage !== "undefined") {
              localStorage.setItem(storageKey, "true");
            }
            const batch = writeBatch(db);
            initialFallback.forEach((item) => {
              const cleanItem = sanitizeData(item);
              const itemRef = doc(db, collectionName, cleanItem.id);
              batch.set(itemRef, cleanItem);
            });
            await batch.commit();
            onUpdate(initialFallback);
            setEncryptedStorage(collectionName, initialFallback, true);
          } catch (err) {
            console.warn(`[Firestore Sync] Notice while seeding ${collectionName}:`, err);
            onUpdate(initialFallback);
          }
        } else {
          // Collection is empty (items were deleted or initialized empty)
          onUpdate([]);
          try {
            setEncryptedStorage(collectionName, [], true);
          } catch (e) {}
        }
        return;
      }

      // Snapshot has documents: mark seeded flag so future empty snapshots know it was populated
      if (typeof localStorage !== "undefined" && !hasSeededBefore) {
        localStorage.setItem(storageKey, "true");
      }

      const remoteItems: T[] = snapshot.docs.map((docSnap) => docSnap.data() as T);
      
      // When Firestore snapshot returns items, remoteItems is the source of truth
      onUpdate(remoteItems);
      try {
        setEncryptedStorage(collectionName, remoteItems, true);
      } catch (e) {}
    },
    (err) => {
      if (err?.code === "unavailable" || err?.message?.includes("unavailable") || err?.message?.includes("offline")) {
        console.warn(`[Firestore Sync] Operating in local offline mode for ${collectionName}. Local cached state is active.`);
      } else {
        console.warn(`[Firestore Sync] Connection note on ${collectionName}:`, err);
      }
      const cached = getCachedStorage();
      if (cached !== null) {
        onUpdate(cached);
      }
    }
  );

  return unsubscribe;
}

/**
 * Upsert a single document in Firestore
 */
export async function saveFirestoreDoc<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<void> {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`enterprizseat_has_seeded_${collectionName}`, "true");
    }
    const cleanItem = sanitizeData(item);
    const docRef = doc(db, collectionName, cleanItem.id);
    await setDoc(docRef, cleanItem, { merge: true });
  } catch (err) {
    console.error(`[Firestore Sync] Error saving doc ${item.id} in ${collectionName}:`, err);
  }
}

/**
 * Delete a document from Firestore
 */
export async function deleteFirestoreDoc(
  collectionName: string,
  id: string
): Promise<void> {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`enterprizseat_has_seeded_${collectionName}`, "true");
    }
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`[Firestore Sync] Error deleting doc ${id} in ${collectionName}:`, err);
  }
}

/**
 * Efficiently save/upsert a batch of documents in Firestore using writeBatch in chunks of 450 items max
 */
export async function saveFirestoreBatch<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`enterprizseat_has_seeded_${collectionName}`, "true");
    }
    const chunkSize = 450;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const cleanItem = sanitizeData(item);
        const docRef = doc(db, collectionName, cleanItem.id);
        batch.set(docRef, cleanItem, { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    console.error(`[Firestore Sync] Error batch saving ${items.length} docs in ${collectionName}:`, err);
  }
}

/**
 * Efficiently delete a batch of documents from Firestore using writeBatch in chunks of 450 items max
 */
export async function deleteFirestoreBatch(
  collectionName: string,
  ids: string[]
): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`enterprizseat_has_seeded_${collectionName}`, "true");
    }
    const chunkSize = 450;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const docRef = doc(db, collectionName, id);
        batch.delete(docRef);
      });
      await batch.commit();
    }
  } catch (err) {
    console.error(`[Firestore Sync] Error batch deleting ${ids.length} docs in ${collectionName}:`, err);
  }
}

/**
 * Sync entire state array to Firestore in safe chunks of 450 items
 */
export async function syncEntireCollection<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  await saveFirestoreBatch(collectionName, items);
}
