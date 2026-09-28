import test from 'node:test';
import assert from 'node:assert/strict';

import { validateProjectUniqueness } from '../../src/projects/projectValidation.js';

test('project save rejects a duplicate name after whitespace normalization', () => {
  const result = validateProjectUniqueness({
    candidate: { id: 'new-project', name: '  โครงการทดสอบ  ', code: 'O-003' },
    projects: [{ id: 'existing-project', name: 'โครงการทดสอบ', code: 'O-002' }],
  });

  assert.deepEqual(result, {
    valid: false,
    duplicateField: 'name',
    existingProjectId: 'existing-project',
  });
});

test('project save rejects a duplicate code regardless of case or surrounding whitespace', () => {
  const result = validateProjectUniqueness({
    candidate: { id: 'new-project', name: 'โครงการใหม่', code: ' o-002 ' },
    projects: [{ id: 'existing-project', name: 'โครงการเดิม', code: 'O-002' }],
  });

  assert.deepEqual(result, {
    valid: false,
    duplicateField: 'code',
    existingProjectId: 'existing-project',
  });
});

test('project save allows an existing project to keep its own name and code', () => {
  const result = validateProjectUniqueness({
    candidate: { id: 'existing-project', name: 'โครงการทดสอบ', code: 'O-002' },
    projects: [{ id: 'existing-project', name: 'โครงการทดสอบ', code: 'O-002' }],
  });

  assert.deepEqual(result, { valid: true });
});
