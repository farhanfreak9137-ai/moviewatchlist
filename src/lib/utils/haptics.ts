export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'selection';

/**
 * Trigger subtle native haptic vibration on mobile devices (Android APK & mobile browsers).
 * Safely fails silently on unsupported or desktop devices.
 */
export function triggerHaptic(type: HapticType = 'light') {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;

  try {
    switch (type) {
      case 'selection':
      case 'light':
        navigator.vibrate(8);
        break;
      case 'medium':
        navigator.vibrate(18);
        break;
      case 'heavy':
        navigator.vibrate(32);
        break;
      case 'success':
        // Crisp double tap pattern
        navigator.vibrate([10, 40, 15]);
        break;
      case 'warning':
        navigator.vibrate([25, 50, 25]);
        break;
    }
  } catch {
    // Graceful fallback
  }
}
