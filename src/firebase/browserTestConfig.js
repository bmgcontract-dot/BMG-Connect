export function browserTestConfig({ enabled, development, hostname }) {
  if (!enabled) return null;
  if (!development || !['localhost', '127.0.0.1'].includes(hostname)) {
    throw new Error('Emulator mode is allowed only on local development hosts');
  }
  return {
    projectId: 'demo-bmg-browser', apiKey: 'emulator-only-not-a-real-key',
    authDomain: 'localhost', appId: 'demo-bmg-browser-web',
  };
}
