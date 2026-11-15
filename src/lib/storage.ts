import localforage from 'localforage';
import { SavedScan } from '../types';

// Storage instance for history and documents
const historyStore = localforage.createInstance({
  name: 'SmartScanner',
  storeName: 'scan_history',
});

// Storage instance for caching heavy AI model binaries / weights
const modelCacheStore = localforage.createInstance({
  name: 'SmartScanner',
  storeName: 'model_cache',
});

// Settings store
const settingsStore = localforage.createInstance({
  name: 'SmartScanner',
  storeName: 'user_settings',
});

export async function saveScanToHistory(scan: SavedScan): Promise<void> {
  await historyStore.setItem(scan.id, scan);
}

export async function getAllSavedScans(): Promise<SavedScan[]> {
  const keys = await historyStore.keys();
  const items: SavedScan[] = [];
  for (const key of keys) {
    const item = await historyStore.getItem<SavedScan>(key);
    if (item) items.push(item);
  }
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

export async function deleteScanFromHistory(id: string): Promise<void> {
  await historyStore.removeItem(id);
}

export async function toggleScanFavorite(id: string): Promise<boolean> {
  const item = await historyStore.getItem<SavedScan>(id);
  if (item) {
    item.favorite = !item.favorite;
    await historyStore.setItem(id, item);
    return item.favorite;
  }
  return false;
}

export async function clearAllHistory(): Promise<void> {
  await historyStore.clear();
}

// Model binary cache functions
export async function getCachedModel(key: string): Promise<ArrayBuffer | null> {
  return await modelCacheStore.getItem<ArrayBuffer>(key);
}

export async function cacheModel(key: string, data: ArrayBuffer): Promise<void> {
  await modelCacheStore.setItem(key, data);
}

export async function isModelCached(key: string): Promise<boolean> {
  const item = await modelCacheStore.getItem(key);
  return item !== null;
}
