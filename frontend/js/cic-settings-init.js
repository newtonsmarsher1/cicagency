// CIC Global Settings Initialization Script
// This script ensures settings are applied consistently across all pages

(function() {
  'use strict';
  
  // Wait for DOM to be ready
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }
  
  // Initialize settings system
  function initializeSettings() {
    console.log('🚀 Initializing CIC Global Settings System...');
    
    // Ensure settings manager is loaded
    if (typeof window.CICSettings === 'undefined') {
      console.error('❌ CIC Settings Manager not found! Loading fallback...');
      loadSettingsManagerFallback();
      return;
    }
    
    // Apply settings immediately
    window.CICSettings.applySettings();
    
    // Set up cross-page communication
    setupCrossPageCommunication();
    
    // Set up settings change listeners
    setupSettingsListeners();
    
    console.log('✅ CIC Global Settings System initialized successfully');
  }
  
  // Fallback settings manager if main one fails to load
  function loadSettingsManagerFallback() {
    console.log('🔄 Loading fallback settings manager...');
    
    // Create minimal settings manager
    window.CICSettings = {
      settings: {
        theme: 'light',
        themeColor: 'green',
        language: 'en',
        currency: 'KES',
        fontSize: 16
      },
      applySettings: function() {
        document.body.setAttribute('data-theme', this.settings.theme);
        document.body.setAttribute('data-theme-color', this.settings.themeColor);
        document.body.style.fontSize = this.settings.fontSize + 'px';
        document.documentElement.lang = this.settings.language;
      },
      get: function(key) {
        return this.settings[key];
      },
      set: function(key, value) {
        this.settings[key] = value;
        this.applySettings();
      },
      addListener: function() {},
      removeListener: function() {}
    };
    
    window.CICSettings.applySettings();
  }
  
  // Set up cross-page communication for settings changes
  function setupCrossPageCommunication() {
    // Listen for storage changes (cross-tab sync)
    window.addEventListener('storage', function(e) {
      if (e.key === 'cic-settings' && e.newValue) {
        console.log('🔄 Settings changed in another tab, applying...');
        try {
          const newSettings = JSON.parse(e.newValue);
          window.CICSettings.settings = { ...window.CICSettings.settings, ...newSettings };
          window.CICSettings.applySettings();
        } catch (error) {
          console.error('❌ Error parsing settings from storage:', error);
        }
      }
    });
    
    // Listen for focus events to refresh settings
    window.addEventListener('focus', function() {
      console.log('👁️ Window focused, refreshing settings...');
      if (window.CICSettings) {
        window.CICSettings.applySettings();
      }
    });
  }
  
  // Set up settings change listeners
  function setupSettingsListeners() {
    if (!window.CICSettings) return;
    
    // Theme change listener
    window.CICSettings.addListener('theme', function(theme) {
      console.log('🎨 Theme changed to:', theme);
      applyThemeChanges(theme);
    });
    
    // Language change listener
    window.CICSettings.addListener('language', function(language) {
      console.log('🌐 Language changed to:', language);
      applyLanguageChanges(language);
    });
    
    // Currency change listener
    window.CICSettings.addListener('currency', function(currency) {
      console.log('💰 Currency changed to:', currency);
      applyCurrencyChanges(currency);
    });
    
    // Font size change listener
    window.CICSettings.addListener('fontSize', function(fontSize) {
      console.log('📝 Font size changed to:', fontSize);
      applyFontSizeChanges(fontSize);
    });
  }
  
  // Apply theme changes
  function applyThemeChanges(theme) {
    document.body.setAttribute('data-theme', theme);
    
    // Update theme-specific elements
    const themeElements = document.querySelectorAll('[data-theme]');
    themeElements.forEach(element => {
      element.setAttribute('data-theme', theme);
    });
    
    // Update CSS custom properties
    const root = document.documentElement;
    if (theme === 'dark') {
      root.style.setProperty('--bg-color', '#1a1a1a');
      root.style.setProperty('--text-color', '#ffffff');
      root.style.setProperty('--card-bg', '#2a2a2a');
    } else {
      root.style.setProperty('--bg-color', '#ffffff');
      root.style.setProperty('--text-color', '#333333');
      root.style.setProperty('--card-bg', '#ffffff');
    }
  }
  
  // Apply language changes
  function applyLanguageChanges(language) {
    document.documentElement.lang = language;
    
    // Update all translatable elements
    document.querySelectorAll('[data-translate]').forEach(element => {
      const key = element.getAttribute('data-translate');
      if (window.CICSettings && window.CICSettings.translate) {
        const translation = window.CICSettings.translate(key);
        if (translation && translation !== key) {
          element.textContent = translation;
        }
      }
    });
    
    // Update placeholder texts
    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
      const key = element.getAttribute('data-translate-placeholder');
      if (window.CICSettings && window.CICSettings.translate) {
        const translation = window.CICSettings.translate(key);
        if (translation && translation !== key) {
          element.placeholder = translation;
        }
      }
    });
  }
  
  // Apply currency changes
  function applyCurrencyChanges(currency) {
    const currencySymbols = {
      'KES': 'KES',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    
    const symbol = currencySymbols[currency] || '$';
    
    // Update all currency displays
    document.querySelectorAll('[data-currency]').forEach(element => {
      element.textContent = symbol;
    });
    
    // Trigger custom event for currency change
    window.dispatchEvent(new CustomEvent('currencyChanged', { 
      detail: { currency: currency } 
    }));
  }
  
  // Apply font size changes
  function applyFontSizeChanges(fontSize) {
    document.body.style.fontSize = fontSize + 'px';
    
    // Update font size for specific elements
    const scalableElements = document.querySelectorAll('.scalable-text');
    scalableElements.forEach(element => {
      element.style.fontSize = fontSize + 'px';
    });
  }
  
  // Force refresh all settings
  function refreshAllSettings() {
    console.log('🔄 Refreshing all settings...');
    
    if (window.CICSettings) {
      window.CICSettings.applySettings();
      
      // Force update all listeners
      const settings = window.CICSettings.settings;
      Object.keys(settings).forEach(key => {
        const value = settings[key];
        if (typeof value === 'object') {
          Object.keys(value).forEach(subKey => {
            window.CICSettings.notifyListeners();
          });
        } else {
          window.CICSettings.notifyListeners();
        }
      });
    }
  }
  
  // Expose refresh function globally
  window.refreshCICSettings = refreshAllSettings;
  
  // Initialize when DOM is ready
  ready(initializeSettings);
  
  // Also initialize on window load as backup
  window.addEventListener('load', function() {
    setTimeout(initializeSettings, 100);
  });
  
  // Initialize immediately if already loaded
  if (document.readyState === 'complete') {
    initializeSettings();
  }
  
})();
