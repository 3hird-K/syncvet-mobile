import * as Crypto from 'expo-crypto';

/**
 * Generates an alphanumeric UUID (RFC 4122 v4) matching Supabase `gen_random_uuid()`.
 * e.g. "d36210d2-82dc-4aa3-8459-8c7205eb9231"
 */
export function generateUUID(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

/**
 * Generates an official 9-digit municipal pet microchip tag number matching the database schema.
 * e.g. "pet-394772099"
 */
export function generateMicrochipNumber(): string {
  const digits = Math.floor(100000000 + Math.random() * 900000000);
  return `pet-${digits}`;
}

