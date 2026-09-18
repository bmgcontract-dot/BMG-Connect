export const LEGACY_CACHE_SCHEMA_VERSION = 1;

export const LEGACY_BUSINESS_KEYS = Object.freeze([
  'bmg_actionPlans',
  'bmg_announcements',
  'bmg_assets',
  'bmg_audits',
  'bmg_companyInfo',
  'bmg_contractors',
  'bmg_contracts',
  'bmg_dailyReports',
  'bmg_deposits',
  'bmg_forms_list',
  'bmg_inventory',
  'bmg_inventory_transactions',
  'bmg_machines',
  'bmg_meeting_agendas',
  'bmg_meeting_attendances',
  'bmg_meeting_ballots',
  'bmg_meeting_gantt_plans',
  'bmg_meeting_invitations',
  'bmg_meeting_land_docs',
  'bmg_meeting_proxies',
  'bmg_meetings',
  'bmg_meters',
  'bmg_othersData',
  'bmg_pmHistoryList',
  'bmg_pmPlans',
  'bmg_projectSchedules',
  'bmg_project_events',
  'bmg_projects',
  'bmg_repairs',
  'bmg_rolePermissions',
  'bmg_tools',
  'bmg_users',
  'bmg_user_profiles_v2',
  'bmg_utilityReadings',
]);

const SENSITIVE_FIELD_NAMES = new Set([
  'accesstoken',
  'apikey',
  'credential',
  'credentials',
  'idtoken',
  'passcode',
  'password',
  'passwordhash',
  'pin',
  'refreshtoken',
  'secret',
  'session',
  'sessiontoken',
  'token',
]);

function normalizeFieldName(fieldName) {
  return String(fieldName).replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isSensitiveField(fieldName) {
  return SENSITIVE_FIELD_NAMES.has(normalizeFieldName(fieldName));
}

function sanitizeValue(value, path = [], redactions = []) {
  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(item, [...path, index], redactions));
  }

  if (!value || typeof value !== 'object') return value;

  const sanitized = {};
  for (const [fieldName, fieldValue] of Object.entries(value)) {
    if (isSensitiveField(fieldName)) {
      redactions.push([...path, fieldName].join('.'));
      continue;
    }
    sanitized[fieldName] = sanitizeValue(fieldValue, [...path, fieldName], redactions);
  }
  return sanitized;
}

function summarizeValue(value) {
  if (Array.isArray(value)) {
    return { valueKind: 'array', itemCount: value.length };
  }
  if (value && typeof value === 'object') {
    return { valueKind: 'object', itemCount: Object.keys(value).length };
  }
  return { valueKind: typeof value, itemCount: value == null ? 0 : 1 };
}

function parseLocalStorageValue(key, serialized, warnings) {
  if (serialized === null || serialized === undefined) return undefined;

  try {
    return JSON.parse(serialized);
  } catch {
    warnings.push({ key, source: 'localStorage', code: 'invalid-json' });
    return undefined;
  }
}

async function readSourceValue({ key, source, read, warnings }) {
  try {
    const value = await read(key);
    if (source === 'localStorage') {
      return parseLocalStorageValue(key, value, warnings);
    }
    return value === undefined || value === null ? undefined : value;
  } catch {
    warnings.push({ key, source, code: 'read-failed' });
    return undefined;
  }
}

export async function captureLegacyCacheSnapshot({
  readLocalStorage,
  readIndexedDb,
  capturedAt = new Date().toISOString(),
  sourceOrigin,
}) {
  if (typeof readLocalStorage !== 'function') {
    throw new TypeError('readLocalStorage must be a function');
  }
  if (typeof readIndexedDb !== 'function') {
    throw new TypeError('readIndexedDb must be a function');
  }
  if (typeof sourceOrigin !== 'string' || sourceOrigin.length === 0) {
    throw new TypeError('sourceOrigin is required');
  }

  const datasets = {};
  const manifest = [];
  const warnings = [];

  for (const key of LEGACY_BUSINESS_KEYS) {
    const [localStorageValue, indexedDbValue] = await Promise.all([
      readSourceValue({
        key,
        source: 'localStorage',
        read: readLocalStorage,
        warnings,
      }),
      readSourceValue({
        key,
        source: 'indexedDb',
        read: readIndexedDb,
        warnings,
      }),
    ]);

    const sourceValues = [
      ['localStorage', localStorageValue],
      ['indexedDb', indexedDbValue],
    ];

    for (const [source, value] of sourceValues) {
      if (value === undefined) continue;

      const redactions = [];
      const sanitizedValue = sanitizeValue(value, [], redactions);
      datasets[key] ||= {};
      datasets[key][source] = sanitizedValue;
      manifest.push({
        key,
        source,
        ...summarizeValue(sanitizedValue),
        redactedFieldCount: redactions.length,
      });
    }
  }

  return {
    schemaVersion: LEGACY_CACHE_SCHEMA_VERSION,
    capturedAt,
    sourceOrigin,
    datasets,
    manifest,
    warnings,
  };
}

