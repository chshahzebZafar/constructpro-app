import AsyncStorage from '@react-native-async-storage/async-storage';

/** Removes every AsyncStorage key that contains the Firebase uid (user-scoped data). */
export async function removeLocalKeysForUid(uid: string): Promise<void> {
  if (!uid) return;
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter((k) => k.includes(uid));
  if (toRemove.length > 0) {
    await AsyncStorage.multiRemove(toRemove);
  }
}
