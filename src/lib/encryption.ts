import CryptoJS from "crypto-js";

// Default Enterprise Master Encryption Key for AES-256 storage protection
const DEFAULT_ENCRYPTION_SECRET = "EnterpriseSeatAllocation_AES256_MasterKey_2026!@#$";

/**
 * Get current active encryption key from localStorage or default
 */
export function getActiveEncryptionKey(): string {
  try {
    const customKey = localStorage.getItem("enterprizseat_custom_enc_key");
    if (customKey && customKey.trim().length > 0) {
      return customKey.trim();
    }
  } catch (e) {}
  return DEFAULT_ENCRYPTION_SECRET;
}

/**
 * Save custom encryption key
 */
export function setCustomEncryptionKey(key: string): void {
  try {
    localStorage.setItem("enterprizseat_custom_enc_key", key);
  } catch (e) {}
}

/**
 * Encrypt any JSON-serializable value into AES-256 ciphertext with 'enc_v1:' prefix
 */
export function encryptData(data: any): string {
  if (data === undefined || data === null) return "";
  try {
    const jsonString = typeof data === "string" ? data : JSON.stringify(data);
    const secret = getActiveEncryptionKey();
    const ciphertext = CryptoJS.AES.encrypt(jsonString, secret).toString();
    return `enc_v1:${ciphertext}`;
  } catch (err) {
    console.error("[AES-256 Encryption] Error encrypting data:", err);
    return typeof data === "string" ? data : JSON.stringify(data);
  }
}

/**
 * Decrypt string ciphertext back to typed object or original string.
 * Gracefully handles both encrypted ('enc_v1:') and legacy unencrypted JSON strings.
 */
export function decryptData<T = any>(payload: string | null | undefined, fallback: T): T {
  if (!payload) return fallback;

  // Check if string is AES encrypted with 'enc_v1:' prefix
  if (typeof payload === "string" && payload.startsWith("enc_v1:")) {
    try {
      const rawCipher = payload.slice(7);
      const secret = getActiveEncryptionKey();
      const bytes = CryptoJS.AES.decrypt(rawCipher, secret);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedText) return fallback;
      try {
        return JSON.parse(decryptedText) as T;
      } catch {
        return decryptedText as unknown as T;
      }
    } catch (err) {
      console.warn("[AES-256 Decryption] Decryption failed or wrong key, falling back:", err);
      return fallback;
    }
  }

  // Fallback: If payload is legacy plain JSON string or already parsed
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as T;
    } catch {
      return payload as unknown as T;
    }
  }

  return payload as T;
}

/**
 * Read from localStorage with automatic AES-256 decryption
 */
export function getEncryptedStorage<T>(key: string, fallback: T): T {
  try {
    const rawVal = localStorage.getItem(`enterprizseat_${key}`);
    if (!rawVal) return fallback;
    return decryptData<T>(rawVal, fallback);
  } catch (e) {
    console.error(`[Encrypted Storage] Failed to read key enterprizseat_${key}:`, e);
    return fallback;
  }
}

/**
 * Debounce timer map to prevent main thread blocking during rapid updates
 */
const storageDebounceMap = new Map<string, any>();

/**
 * Write to localStorage with automatic non-blocking debounced AES-256 encryption
 */
export function setEncryptedStorage(key: string, data: any, immediate: boolean = false): void {
  if (storageDebounceMap.has(key)) {
    clearTimeout(storageDebounceMap.get(key));
    storageDebounceMap.delete(key);
  }

  const performWrite = () => {
    try {
      const encryptedStr = encryptData(data);
      localStorage.setItem(`enterprizseat_${key}`, encryptedStr);
    } catch (e) {
      console.error(`[Encrypted Storage] Failed to set key enterprizseat_${key}:`, e);
    }
  };

  if (immediate) {
    performWrite();
  } else {
    // Debounce write by 250ms so UI rendering and dragging remain butter smooth
    const timer = setTimeout(() => {
      storageDebounceMap.delete(key);
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(performWrite);
      } else {
        performWrite();
      }
    }, 250);
    storageDebounceMap.set(key, timer);
  }
}

/**
 * Completely purge all local enterprizseat cache and temporary data stores
 */
export function clearAllEnterprizCache(): number {
  let count = 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("enterprizseat_") || k.includes("enterpriz"))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => {
      localStorage.removeItem(k);
      count++;
    });
    console.log(`[Cache System] Cleared ${count} local storage cache keys.`);
  } catch (e) {
    console.error("[Cache System] Error clearing cache:", e);
  }
  return count;
}

/**
 * Verify encryption health by performing a round-trip encrypt & decrypt test
 */
export function verifyEncryptionHealth(): { success: boolean; latencyMs: number; cipherSample: string } {
  const startTime = performance.now();
  const testPayload = { test: "Enterprise Seat Allocation Security Check", timestamp: Date.now() };
  const cipher = encryptData(testPayload);
  const decrypted = decryptData(cipher, null);
  const endTime = performance.now();

  const isMatching = decrypted && decrypted.test === testPayload.test && decrypted.timestamp === testPayload.timestamp;
  return {
    success: isMatching,
    latencyMs: Math.round((endTime - startTime) * 100) / 100,
    cipherSample: cipher.substring(0, 32) + "..."
  };
}

/**
 * Re-encrypt all existing 'enterprizseat_*' localStorage entries using current active key
 */
export function reencryptAllLocalStorage(): number {
  let count = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith("enterprizseat_")) {
        const rawVal = localStorage.getItem(storageKey);
        if (rawVal) {
          // Decrypt if already encrypted or parse if plain
          const cleanKey = storageKey.replace("enterprizseat_", "");
          const decoded = decryptData(rawVal, null);
          if (decoded !== null) {
            setEncryptedStorage(cleanKey, decoded);
            count++;
          }
        }
      }
    }
  } catch (e) {
    console.error("[Encrypted Storage] Error during re-encryption sweep:", e);
  }
  return count;
}
