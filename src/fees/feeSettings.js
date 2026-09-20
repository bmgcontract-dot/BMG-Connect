export const DEFAULT_FEE_SETTINGS = Object.freeze({
  noticeThresholdDays: 90,
  freezeThresholdMonths: 6,
});

function positiveInteger(value, fallback, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) return fallback;
  return parsed;
}

export function feeSettingsDocumentId(projectId) {
  if (typeof projectId !== 'string' || projectId.trim() === '') {
    throw new TypeError('projectId is required for central-fee settings');
  }
  return `central_fee_settings_${projectId}`;
}

export function readFeeSettings(value) {
  const source = value && !Array.isArray(value) && typeof value === 'object' ? value : {};
  return {
    noticeThresholdDays: positiveInteger(
      source.noticeThresholdDays,
      DEFAULT_FEE_SETTINGS.noticeThresholdDays,
    ),
    freezeThresholdMonths: positiveInteger(
      source.freezeThresholdMonths,
      DEFAULT_FEE_SETTINGS.freezeThresholdMonths,
      120,
    ),
  };
}

export function createFeeSettingsDocument({
  projectId,
  noticeThresholdDays,
  freezeThresholdMonths,
  updatedAt,
  updatedBy,
}) {
  return {
    projectId,
    menuId: 'proj_centralfee',
    ...readFeeSettings({ noticeThresholdDays, freezeThresholdMonths }),
    updatedAt,
    updatedBy,
  };
}
