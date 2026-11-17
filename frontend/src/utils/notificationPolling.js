export function hasUnreadCountIncreased(previousCount, nextCount) {
  return Number(nextCount) > Number(previousCount);
}

/** Mengembalikan notifikasi yang belum pernah ditemukan dalam sesi bell ini. */
export function findUnseenNotificationIds(items, knownIds) {
  const known = knownIds instanceof Set ? knownIds : new Set(knownIds || []);
  return (Array.isArray(items) ? items : []).filter((item) => (
    item?.id_notifikasi != null && !known.has(String(item.id_notifikasi))
  ));
}
