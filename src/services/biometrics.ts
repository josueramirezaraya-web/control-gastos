export const BiometricsService = {
  isAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    );
  },

  async authenticateBiometric(): Promise<boolean> {
    try {
      if (!this.isAvailable()) {
        return false;
      }

      // Check if platform authenticator (TouchID / FaceID / Windows Hello) is available
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        return false;
      }

      // Trigger WebAuthn credential retrieval challenge
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // We attempt a lightweight authentication challenge
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'preferred',
          rpId: window.location.hostname || 'localhost',
        },
      });

      return !!credential;
    } catch (e: any) {
      console.warn('Biometric auth prompt cancelled or failed:', e?.name || e);
      // If user cancelled, or credentials not found, return false to allow PIN fallback
      return false;
    }
  },

  verifyPin(inputPin: string, storedPin: string): boolean {
    return inputPin.trim() === storedPin.trim();
  },
};
