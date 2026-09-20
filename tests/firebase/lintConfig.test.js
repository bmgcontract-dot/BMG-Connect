import test from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

test('lint rejects undefined JSX and conditional hooks in browser source', async () => {
  const eslint = new ESLint();
  const [result] = await eslint.lintText(`
    import { useState } from 'react';
    export function Example({ enabled }) {
      if (enabled) useState(0);
      return <MissingComponent />;
    }
  `, { filePath: 'src/LintProbe.jsx' });
  const rules = result.messages.map(message => message.ruleId);
  assert.ok(rules.includes('react/jsx-no-undef'));
  assert.ok(rules.includes('react-hooks/rules-of-hooks'));
});

test('lint separates browser globals from Node globals and checks effect dependencies', async () => {
  const eslint = new ESLint();
  const [browser] = await eslint.lintText(`
    import { useEffect } from 'react';
    export function Example({ value }) {
      useEffect(() => { document.title = value; }, []);
      return process.env.VALUE;
    }
  `, { filePath: 'src/LintProbe.jsx' });
  assert.ok(browser.messages.some(message => message.ruleId === 'no-undef' && message.message.includes('process')));
  assert.ok(browser.messages.some(message => message.ruleId === 'react-hooks/exhaustive-deps'));
  const [server] = await eslint.lintText('export const mode = process.env.NODE_ENV;', { filePath: 'api/lint-probe.js' });
  assert.equal(server.messages.length, 0);
});
