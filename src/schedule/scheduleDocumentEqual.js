// Firestore map key order is not significant. Arrays (including staff order) are.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

export function scheduleDocumentEqual(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}
