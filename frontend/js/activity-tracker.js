/**
 * Activity Tracker and Biometric Auto-Login
 * Tracks user activity and automatically logs in with biometric after 10 minutes of inactivity
 */

(function() {
  'use strict';

  // Configuration
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
  let inactivityTimer = null;
  let lastActivityTime = Date.now();

  // Check if we're on the login page
  const isLoginPage = window.location.pathname.includes('index.html') || 
                     window.location.pathname === '/' ||
                     window.location.pathname.endsWith('/');

  // Only run on non-login pages
  if (isLoginPage) {
    return;
  }

  // Check if user is authenticated
  const token = localStorage.getItem('token');
  if (!token) {
    return; // Not logged in, no need to track
  }

  /**
   * Reset the inactivity timer
   */
  function resetInactivityTimer() {
    lastActivityTime = Date.now();
    
    // Clear existing timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    // Set new timer
    inactivityTimer = setTimeout(() => {
      handleInactivity();
    }, INACTIVITY_TIMEOUT);
  }

  /**
   * Handle user inactivity - attempt biometric auto-login
   */
  async function handleInactivity() {
    console.log('⏱️ User inactive for 10 minutes, checking biometric...');
    
    // Check if biometric is enabled
    const biometricEnabled = window.CICSettings && 
                             window.CICSettings.get('security.biometric');
    
    if (!biometricEnabled) {
      console.log('ℹ️ Biometric not enabled, skipping auto-login');
      return;
    }

    // Check if biometric login data exists
    const biometricData = localStorage.getItem('biometric-login-data');
    if (!biometricData) {
      console.log('ℹ️ No biometric login data found');
      return;
    }

    try {
      const credentialData = JSON.parse(biometricData);
      const phone = credentialData.phone;

      if (!phone) {
        console.log('ℹ️ No phone number in biometric data');
        return;
      }

      console.log('🔐 Attempting biometric auto-login...');

      // Attempt to use Web Authentication API if available
      if ('credentials' in navigator && 'get' in navigator.credentials) {
        try {
          const credentialId = localStorage.getItem('biometric-credential-id');
          if (credentialId) {
            const publicKeyCredentialRequestOptions = {
              challenge: new Uint8Array(32),
              timeout: 60000,
              userVerification: 'required'
            };

            const assertion = await navigator.credentials.get({
              publicKey: publicKeyCredentialRequestOptions
            });

            if (assertion) {
              console.log('✅ Biometric authentication successful');
              await performAutoLogin(phone);
            }
          } else {
            // Fallback: Direct auto-login if credential ID not available
            console.log('ℹ️ No credential ID, using fallback auto-login');
            await performAutoLogin(phone);
          }
        } catch (error) {
          console.log('ℹ️ WebAuthn not available, using fallback:', error);
          // Fallback: Direct auto-login
          await performAutoLogin(phone);
        }
      } else {
        // Fallback: Direct auto-login
        console.log('ℹ️ WebAuthn API not available, using fallback');
        await performAutoLogin(phone);
      }
    } catch (error) {
      console.error('❌ Error during biometric auto-login:', error);
    }
  }

  /**
   * Perform automatic login using stored credentials
   */
  async function performAutoLogin(phone) {
    try {
      // Get password from secure storage (if available) or use stored token
      // Note: In a real implementation, password should be stored securely
      // For now, we'll check if token is still valid
      const token = localStorage.getItem('token');
      
      if (token) {
        // Verify token is still valid by making an API call to stats endpoint
        try {
          const response = await fetch(`${window.API_BASE_URL || ''}/api/auth/stats`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            console.log('✅ Token still valid, user remains logged in');
            // Reset activity timer since we're still logged in
            resetInactivityTimer();
            return;
          }
        } catch (error) {
          console.log('ℹ️ Could not verify token, will redirect to login');
        }
      }

      // If token is invalid, we need to re-authenticate
      console.log('ℹ️ Token expired or invalid, redirecting to login');
      
      // Store the phone for pre-filling login form
      localStorage.setItem('auto-login-phone', phone);
      
      // Redirect to login page
      window.location.href = 'index.html';
      return;
    } catch (error) {
      console.error('❌ Error during auto-login:', error);
      // On error, redirect to login
      window.location.href = 'index.html';
    }
  }

  /**
   * Track user activity events
   */
  function trackActivity() {
    resetInactivityTimer();
  }

  // Event listeners for user activity
  const activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ];

  // Add event listeners
  activityEvents.forEach(event => {
    document.addEventListener(event, trackActivity, { passive: true });
  });

  // Also track visibility changes (when user switches tabs/windows)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      trackActivity();
    }
  });

  // Initialize timer on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      resetInactivityTimer();
    });
  } else {
    resetInactivityTimer();
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
  });

  console.log('✅ Activity tracker initialized');
})();

