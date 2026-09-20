import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('central-fee settings use the shared Firestore collection instead of component-only state', async () => {
  const source = await readFile(new URL('../../App.jsx', import.meta.url), 'utf8');

  assert.equal(
    /feeSettingsDocumentId\(selectedProject\.id\)/.test(source),
    true,
    'Central-fee settings must use a project-scoped shared document.',
  );
  assert.equal(
    /setDoc\(settingsRef,\s*createFeeSettingsDocument\(/.test(source),
    true,
    'The settings save action must write the normalized shared document.',
  );
});

test('fee-settings normalization preserves valid values and rejects invalid input', async () => {
  const {
    DEFAULT_FEE_SETTINGS,
    createFeeSettingsDocument,
    feeSettingsDocumentId,
    readFeeSettings,
  } = await import('../../src/fees/feeSettings.js');

  assert.equal(feeSettingsDocumentId('project-a'), 'central_fee_settings_project-a');
  assert.deepEqual(readFeeSettings([]), DEFAULT_FEE_SETTINGS);
  assert.deepEqual(
    readFeeSettings({
      noticeThresholdDays: 45,
      freezeThresholdMonths: 3,
    }),
    {
      noticeThresholdDays: 45,
      freezeThresholdMonths: 3,
    },
  );
  assert.deepEqual(
    createFeeSettingsDocument({
      projectId: 'project-a',
      noticeThresholdDays: 'not-a-number',
      freezeThresholdMonths: -2,
      updatedAt: '2026-09-20T00:00:00.000Z',
      updatedBy: 'qa-admin',
    }),
    {
      projectId: 'project-a',
      menuId: 'proj_centralfee',
      ...DEFAULT_FEE_SETTINGS,
      updatedAt: '2026-09-20T00:00:00.000Z',
      updatedBy: 'qa-admin',
    },
  );
});
