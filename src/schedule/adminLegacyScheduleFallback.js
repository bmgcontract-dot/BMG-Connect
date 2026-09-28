function canonicalScheduleKey({ key, month, staffIds, staffAliases }) {
  if (typeof key !== 'string' || !key.includes(`_${month}-`)) return null;

  for (const staffId of staffIds) {
    const identities = [staffId, ...(staffAliases?.[staffId] ?? [])];
    for (const identity of identities) {
      if (typeof identity !== 'string' || !key.startsWith(`${identity}_`)) continue;
      const suffix = key.slice(identity.length + 1);
      if (!/^\d{4}-\d{2}-\d{2}(?:_act)?$/.test(suffix)) continue;
      return `${staffId}_${suffix}`;
    }
  }
  return null;
}

export function buildAdminLegacyScheduleFallback({
  isAdmin,
  month,
  staffIds = [],
  staffAliases = {},
  migratedStaffIds = [],
  projectSchedules = {},
  legacySchedules = {},
}) {
  const current = projectSchedules && typeof projectSchedules === 'object'
    ? projectSchedules
    : {};
  if (!isAdmin || typeof month !== 'string' || !Array.isArray(staffIds)) {
    return { schedules: current, isReadOnlyFallback: false, legacyCellCount: 0 };
  }

  const migrated = new Set(Array.isArray(migratedStaffIds) ? migratedStaffIds : []);
  const allowedStaffIds = staffIds.filter((value) => typeof value === 'string' && value.length > 0 && !migrated.has(value));
  const legacy = {};
  for (const [key, value] of Object.entries(legacySchedules ?? {})) {
    const canonicalKey = canonicalScheduleKey({
      key,
      month,
      staffIds: allowedStaffIds,
      staffAliases,
    });
    if (canonicalKey) legacy[canonicalKey] = value;
  }

  return {
    schedules: { ...legacy, ...current },
    isReadOnlyFallback: Object.keys(legacy).length > 0,
    legacyCellCount: Object.keys(legacy).length,
  };
}
