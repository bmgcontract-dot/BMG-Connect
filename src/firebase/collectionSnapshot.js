function formatMonthStart(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export function createMonthScope(field, yearMonth) {
  if (!field) throw new TypeError('A date field is required');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
    throw new TypeError('A valid YYYY-MM month is required');
  }

  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, month, 1));
  return {
    field,
    start: `${yearMonth}-01`,
    endExclusive: formatMonthStart(nextMonth),
  };
}

export function reconcileCollectionSnapshot({
  currentItems,
  serverItems,
  scope,
  documentIdField = 'id',
}) {
  if (!Array.isArray(serverItems)) return [];
  if (!scope) return serverItems;

  const cachedItems = Array.isArray(currentItems) ? currentItems : [];
  const serverIds = new Set(
    serverItems
      .map((item) => item?.[documentIdField])
      .filter((id) => id !== undefined && id !== null),
  );
  const historicalItems = cachedItems.filter((item) => {
    const id = item?.[documentIdField];
    if (id !== undefined && id !== null && serverIds.has(id)) return false;

    const value = item?.[scope.field];
    const isInsideScope = typeof value === 'string'
      && value >= scope.start
      && value < scope.endExclusive;
    return !isInsideScope;
  });

  return [...historicalItems, ...serverItems];
}
