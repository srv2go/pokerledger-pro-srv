const getPlugin = () => {
  if (typeof window === 'undefined' || !window.Capacitor || !window.Capacitor.Plugins) return null;
  return window.Capacitor.Plugins.Biometric || window.Capacitor.Plugins.Biometrics || null;
};

const buildResult = (available, label = 'Unavailable') => ({ available, label });

export const biometricService = {
  isAvailable: async () => {
    try {
      const plugin = getPlugin();
      if (!plugin || !plugin.isAvailable) return buildResult(false);
      const result = await plugin.isAvailable();
      return buildResult(Boolean(result?.available), result?.biometryType || 'Biometric');
    } catch (e) {
      console.warn('Biometric availability check failed', e);
      return buildResult(false);
    }
  },
  authenticate: async (reason = 'Unlock LedgerAI') => {
    const plugin = getPlugin();
    if (!plugin || !plugin.verify) throw new Error('Biometrics not available');
    const response = await plugin.verify({ reason, title: 'LedgerAI', subtitle: 'Confirm your identity' });
    if (!response?.verified) throw new Error('Biometric verification failed');
    return true;
  },
};
