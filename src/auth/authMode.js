export function resolveAuthMode(configuredMode) {
  return configuredMode === 'legacy' ? 'legacy' : 'firebase';
}
