export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * UTC calendar day key (YYYY-MM-DD). The rewarded-ad daily cap is keyed by
 * account/install + UTC day so it matches the backend SSV ledger exactly.
 */
export function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getDailySeed(date = new Date()): string {
  return `daily-vault-${getLocalDateKey(date)}`;
}

