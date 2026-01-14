'use client';

import { isSavedUserFile, SavedUserFile, UserFile } from "@/core/UserFile";

const DB_NAME = 'userfiles-db';
const DB_VERSION = 1;
const FILE_STORE = 'files';
const META_STORE = 'meta';
const DELETED_KEY = 'DELETED_FILES';

function alertUpdateListUserFile() {
  window.dispatchEvent(new CustomEvent("AlertUpdateListUserFile"));
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txRequest<T>(store: IDBObjectStore, req: IDBRequest, resolve: (v: T) => void, reject: (e: any) => void) {
  req.onsuccess = () => resolve(req.result as T);
  req.onerror = () => reject(req.error);
}

async function runTransaction<T>(storeName: string, mode: IDBTransactionMode, job: (store: IDBObjectStore) => IDBRequest | Promise<IDBRequest>): Promise<T> {
  const db = await openIDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    (async () => {
      try {
        const r = await job(store);
        txRequest<T>(store, r as IDBRequest, resolve, reject);
      } catch (err) {
        reject(err);
      }
    })();
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    tx.onerror = () => reject(tx.error);
  });
}

export async function createUserFile(userFile: SavedUserFile): Promise<boolean> {
  try {
    await runTransaction<void>(FILE_STORE, 'readwrite', (store) => store.put(userFile));
    alertUpdateListUserFile();
    return true;
  } catch (e) {
    console.error('createUserFile failed', e);
    return false;
  }
}

export async function readSavedUserFile(name: string): Promise<SavedUserFile | null> {
  try {
    const result = await runTransaction<SavedUserFile | undefined>(FILE_STORE, 'readonly', (store) => store.get(name));
    if (!result) return null;
    return isSavedUserFile(result) ? result : null;
  } catch (e) {
    console.error('readSavedUserFile failed', e);
    return null;
  }
}

export async function updateUserFile(userFile: SavedUserFile): Promise<boolean> {
  return createUserFile(userFile);
}

export async function deleteUserFile(userFile: SavedUserFile): Promise<void> {
  try {
    const deleted: Record<string, any> | undefined = await runTransaction<Record<string, any> | undefined>(META_STORE, 'readonly', (s) => s.get(DELETED_KEY)).catch(() => undefined);
    const entCount: Record<string, number> = {};
    if ((userFile as any).pool && Array.isArray((userFile as any).pool.entities)) {
      (userFile as any).pool.entities.forEach((e: any) => { entCount[e.type] = (entCount[e.type] || 0) + 1; });
    } else if (Array.isArray((userFile as any).ents)) {
      (userFile as any).ents.forEach((e: any) => { entCount[e.type] = (entCount[e.type] || 0) + 1; });
    }

    const updated = { ...(deleted || {}) };
    updated[userFile.name] = {
      name: userFile.name,
      imported: (userFile as any).imported,
      modified: (userFile as any).modified,
      entCount,
    };

    await runTransaction<void>(META_STORE, 'readwrite', (store) => store.put({ key: DELETED_KEY, value: updated }));
    await runTransaction<void>(FILE_STORE, 'readwrite', (store) => store.delete(userFile.name));

    alertUpdateListUserFile();
  } catch (e) {
    console.error('deleteUserFile failed', e);
  }
}

export async function listUserFile(): Promise<SavedUserFile[]> {
  try {
    const arr = await runTransaction<SavedUserFile[]>(FILE_STORE, 'readonly', (store) => store.getAll());
    return (arr ?? []).filter((x: any) => isSavedUserFile(x));
  } catch (e) {
    console.error('listUserFile failed', e);
    return [];
  }
}

export async function readDeletedFilesMeta(): Promise<Record<string, any>> {
  try {
    const meta = await runTransaction<{ key: string, value: Record<string, any> } | undefined>(META_STORE, 'readonly', (s) => s.get(DELETED_KEY));
    return (meta && meta.value) || {};
  } catch {
    return {};
  }
}
