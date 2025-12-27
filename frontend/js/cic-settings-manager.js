// Global Settings Manager for CIC System
class CICSettingsManager {
  constructor() {
    this.settings = this.loadSettings();
    this.listeners = new Map();
    this.init();
  }

  // Initialize settings manager
  init() {
    // Apply settings on page load
    this.applySettings();

    // Listen for storage changes (for cross-tab sync)
    window.addEventListener('storage', (e) => {
      if (e.key === 'cic-settings') {
        this.settings = this.loadSettings();
        this.applySettings();
        this.notifyListeners();
      }
    });
  }

  // Load settings from localStorage
  loadSettings() {
    const defaultSettings = {
      theme: 'light',
      themeColor: 'green',
      language: 'en',
      currency: 'USD',  // Default to USD
      country: 'US',    // Default country
      dateFormat: 'DD/MM/YYYY',
      fontSize: 16,
      notifications: {
        push: true,
        taskReminders: true,
        paymentAlerts: true,
        marketing: false
      },
      security: {
        twoFA: false,
        biometric: false
      },
      app: {
        autoRefresh: true,
        haptic: true,
        debug: false
      }
    };

    try {
      const saved = localStorage.getItem('cic-settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return defaultSettings;
    }
  }

  // Save settings to localStorage
  saveSettings() {
    try {
      localStorage.setItem('cic-settings', JSON.stringify(this.settings));
      this.notifyListeners();
      console.log('✅ Settings saved:', this.settings);
    } catch (error) {
      console.error('❌ Error saving settings:', error);
    }
  }

  // Get a setting value
  get(key) {
    return this.getNestedValue(this.settings, key);
  }

  // Set a setting value
  set(key, value) {
    this.setNestedValue(this.settings, key, value);
    this.saveSettings();
    this.applySettings();
  }

  // Get nested object value
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Set nested object value
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Apply settings to the current page
  applySettings() {
    // Check if document.body exists (DOM might not be ready yet)
    if (!document.body) {
      // If body doesn't exist, wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.applySettings());
        return;
      }
      // If body still doesn't exist after DOMContentLoaded, return early
      return;
    }

    // Apply theme to both body and html element for better compatibility
    document.body.setAttribute('data-theme', this.settings.theme);
    document.body.setAttribute('data-theme-color', this.settings.themeColor);
    document.documentElement.setAttribute('data-theme', this.settings.theme);
    document.documentElement.setAttribute('data-theme-color', this.settings.themeColor);

    // Apply font size to both body and html
    document.body.style.fontSize = this.settings.fontSize + 'px';
    document.documentElement.style.fontSize = this.settings.fontSize + 'px';

    // Apply language
    this.applyLanguage();

    // Apply theme colors
    this.applyThemeColors();

    // Apply other settings
    this.applyNotificationSettings();
    this.applyAppSettings();

    // Force update all currency displays
    this.updateCurrencyDisplay();

    // Force update all date displays
    this.updateDateFormat();

    // Trigger custom event for settings change so all pages can update
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('settingsApplied', {
        detail: { settings: this.settings }
      }));
    }

    // Notify all listeners that settings have been applied
    this.notifyListeners();
  }

  // Apply language settings
  applyLanguage() {
    const language = this.settings.language;

    // Update document language
    document.documentElement.lang = language;

    // Update meta tags
    const metaLang = document.querySelector('meta[name="language"]');
    if (metaLang) {
      metaLang.content = language;
    }

    // Apply translations if language manager exists and has setLanguage method
    if (window.languageManager && typeof window.languageManager.setLanguage === 'function') {
      window.languageManager.setLanguage(language);
    } else if (window.languageManager && typeof window.languageManager.applyLanguage === 'function') {
      window.languageManager.applyLanguage();
    }

    // Update currency display
    this.updateCurrencyDisplay();

    // Update date format
    this.updateDateFormat();
  }

  // Apply theme colors
  applyThemeColors() {
    const themeColor = this.settings.themeColor;
    const colorMap = {
      green: {
        primary: '#00ff88',
        accent: '#32ff7e',
        bg: '#e8fff0',
        dark: '#00cc6a',
        light: '#33ff99',
        darkGreen: '#006633'
      },
      blue: {
        primary: '#2196f3',
        accent: '#64b5f6',
        bg: '#e3f2fd',
        dark: '#1976d2',
        light: '#64b5f6',
        darkGreen: '#0d47a1'
      },
      purple: {
        primary: '#9c27b0',
        accent: '#ba68c8',
        bg: '#f3e5f5',
        dark: '#7b1fa2',
        light: '#ba68c8',
        darkGreen: '#4a148c'
      },
      orange: {
        primary: '#ff9800',
        accent: '#ffb74d',
        bg: '#fff3e0',
        dark: '#f57c00',
        light: '#ffb74d',
        darkGreen: '#e65100'
      },
      red: {
        primary: '#f44336',
        accent: '#ef5350',
        bg: '#ffebee',
        dark: '#d32f2f',
        light: '#ef5350',
        darkGreen: '#b71c1c'
      }
    };

    const colors = colorMap[themeColor] || colorMap.green;

    // Update all CSS custom properties for brand colors
    document.documentElement.style.setProperty('--brand-green', colors.primary);
    document.documentElement.style.setProperty('--brand-accent', colors.accent);
    document.documentElement.style.setProperty('--icon-bg', colors.bg);
    document.documentElement.style.setProperty('--icon-color', colors.primary);
    document.documentElement.style.setProperty('--primary-green', colors.primary);
    document.documentElement.style.setProperty('--dark-green', colors.dark);
    document.documentElement.style.setProperty('--light-green', colors.light);
    document.documentElement.style.setProperty('--brand-dark', colors.darkGreen);
    document.documentElement.style.setProperty('--luminous-green', colors.primary);
    document.documentElement.style.setProperty('--luminous-green-dark', colors.dark);
    document.documentElement.style.setProperty('--luminous-green-light', colors.light);

    // Update theme-color meta tag
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.content = colors.primary;
    }
  }

  // Update currency display
  updateCurrencyDisplay() {
    const currency = this.settings.currency || 'USD';
    const currencySymbols = {
      'KES': 'KES',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };

    // Update all currency displays
    document.querySelectorAll('[data-currency]').forEach(element => {
      element.textContent = currencySymbols[currency] || '$';
    });

    // Trigger custom event for currency change so pages can update amounts
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('currencyChanged', {
        detail: { currency: currency }
      }));
    }
  }

  // Update date format
  updateDateFormat() {
    const format = this.settings.dateFormat;

    // Update date displays
    document.querySelectorAll('[data-date-format]').forEach(element => {
      const date = new Date(element.dataset.date);
      element.textContent = this.formatDate(date, format);
    });
  }

  // Format date according to setting
  formatDate(date, format) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    switch (format) {
      case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
      default: return `${day}/${month}/${year}`;
    }
  }

  // Apply notification settings
  applyNotificationSettings() {
    // Enable/disable notifications based on settings
    if ('Notification' in window) {
      if (this.settings.notifications.push) {
        Notification.requestPermission();
      }
    }
  }

  // Apply app settings
  applyAppSettings() {
    // Check if document.body exists
    if (!document.body) {
      return;
    }

    // Apply haptic feedback setting
    if (!this.settings.app.haptic) {
      document.body.classList.add('no-haptic');
    } else {
      document.body.classList.remove('no-haptic');
    }

    // Apply debug mode
    if (this.settings.app.debug) {
      document.body.classList.add('debug-mode');
    } else {
      document.body.classList.remove('debug-mode');
    }
  }

  // Add listener for settings changes
  addListener(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  // Remove listener
  removeListener(key, callback) {
    if (this.listeners.has(key)) {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach((callbacks, key) => {
      const value = this.get(key);
      callbacks.forEach(callback => {
        try {
          callback(value, key);
        } catch (error) {
          console.error('Error in settings listener:', error);
        }
      });
    });
  }

  // Reset all settings to default
  reset() {
    localStorage.removeItem('cic-settings');
    this.settings = this.loadSettings();
    this.applySettings();
    this.notifyListeners();
  }

  // Export settings
  export() {
    return JSON.stringify(this.settings, null, 2);
  }

  // Import settings
  import(settingsJson) {
    try {
      const imported = JSON.parse(settingsJson);
      this.settings = { ...this.settings, ...imported };
      this.saveSettings();
      this.applySettings();
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }
}

// Global language manager
class CICLanguageManager {
  constructor() {
    this.translations = {};
    this.currentLanguage = 'en';
    this.init();
  }

  async init() {
    await this.loadTranslations();
    this.applyLanguage();
  }

  async loadTranslations() {
    try {
      // Load translation files (optional - use built-in if external fails)
      const languages = ['en', 'sw', 'fr', 'ar', 'hi'];

      for (const lang of languages) {
        try {
          const response = await fetch(`/translations/${lang}.json`);
          if (response.ok) {
            const externalTranslations = await response.json();
            // Merge external with built-in translations
            this.translations[lang] = { ...this.translations[lang], ...externalTranslations };
            console.log(`✅ Loaded external translations for ${lang}`);
          } else {
            console.log(`📦 Using built-in translations for ${lang}`);
          }
        } catch (error) {
          console.log(`📦 Using built-in translations for ${lang} (external load failed)`);
        }
      }

      // Comprehensive translations
      this.translations.en = {
        // Navigation
        'home': 'Home',
        'tasks': 'Tasks',
        'level': 'Level',
        'withdraw': 'Withdraw',
        'profile': 'Profile',
        'settings': 'Settings',

        // Task Page
        'task-list-title': 'Task List - CIC',
        'ongoing-label': 'Ongoing',
        'all-label': 'All',
        'completed-label': 'Completed',
        'start-task': 'Start Task',
        'task-done': 'Task Done',
        'earn': 'Earn',
        'today': 'Today',
        'balance': 'Balance',
        'streak': 'Streak',
        'search-tasks': 'Search tasks...',
        'refresh': 'Refresh',
        'notifications': 'Notifications',
        'level': 'Level',
        'completed': 'Completed',

        // Rewards Page
        'rewards-info-title': 'Rewards Information',
        'how-it-works': 'How Rewards Work',
        'task-rewards': 'Task Rewards',
        'task-rewards-desc': 'Complete daily tasks to earn cash rewards. The amount you earn depends on your VIP level.',
        'daily-tasks': 'Daily Tasks',
        'reward-per-task': 'Reward/Task',
        'daily-income': 'Daily Income',
        'referral-program': 'Referral Program',
        'referral-program-desc': 'Invite friends to join CIC and earn commissions when they upgrade their VIP level.',
        'referral-bonuses': 'Referral Bonuses',
        'referral-bonus-desc': 'Earn a one-time bonus when your direct invitee upgrades to a new VIP level.',
        'friend-level': 'Friend\'s New Level',
        'bonus-amount': 'Your Bonus',
        'withdrawal-rules': 'Withdrawal Rules',
        'withdrawal-rule-1': 'Minimum withdrawal amount is KES 500.',
        'withdrawal-rule-2': 'Withdrawals are processed within 24 hours.',
        'withdrawal-rule-3': 'Handling fee of 5% applies.',
        'tip': 'Tip',
        'referral-tip': 'The more active users you invite, the higher your daily team commission!',

        // Withdrawal Page
        'withdrawal': 'Withdrawal',
        'available-balance': 'Available Balance',
        'withdraw-funds': 'Withdraw Funds',
        'withdrawal-method': 'Withdrawal Method',
        'select-method': 'Select method',
        'mpesa': 'M-Pesa',
        'bank-transfer': 'Bank Transfer',
        'airtel-money': 'Airtel Money',
        'phone-account': 'Phone Number / Account Number',
        'amount': 'Amount',
        'request-withdrawal': 'Request Withdrawal',
        'recent-withdrawals': 'Recent Withdrawals',
        'no-history': 'No withdrawal history',

        // Settings Page
        'account-management': 'Account Management',
        'appearance': 'Appearance',
        'language-regional': 'Language & Regional',
        'notifications': 'Notifications',
        'privacy-security': 'Privacy & Security',
        'app-behavior': 'App Behavior',
        'advanced': 'Advanced',
        'theme': 'Theme',
        'light': 'Light',
        'dark': 'Dark',
        'accent-color': 'Accent Color',
        'font-size': 'Font Size',
        'language': 'Language',
        'currency': 'Currency',
        'date-format': 'Date Format',
        'push-notifications': 'Push Notifications',
        'task-reminders': 'Task Reminders',
        'payment-alerts': 'Payment Alerts',
        'marketing': 'Marketing',
        'two-factor': 'Two-Factor Authentication',
        'biometric-login': 'Biometric Login',
        'auto-refresh': 'Auto Refresh',
        'haptic-feedback': 'Haptic Feedback',
        'debug-mode': 'Debug Mode',

        // Common
        'save': 'Save',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
        'error': 'Error',
        'success': 'Success',
        'loading': 'Loading...',
        'processing': 'Processing...',
        'back': 'Back',
        'next': 'Next',
        'done': 'Done',
        'ok': 'OK',
        'yes': 'Yes',
        'no': 'No',

        // New - Home Page
        'welcome-dashboard': 'Welcome to your dashboard',
        'income-wallet': 'Income Wallet',
        'download-app': 'Download App',
        'get-mobile-app': 'Get Mobile App',
        'recharge': 'Recharge',
        'invest': 'Invest',
        'quick-access': 'Quick Access',
        'team-management': 'Team Management',
        'news': 'News',
        'benefits': 'Benefits',
        'todays-performance': 'Today\'s Performance',
        'todays-earnings': 'Today\'s Earnings',
        'tasks-completed': 'Tasks Completed',
        'team-members': 'Team Members',
        'total-earnings': 'Total Earnings',
        'powered-by': 'Powered by',
        'ai-assistant': 'AI Assistant',
        'ai-welcome': 'Hello! I\'m your AI assistant. How can I help you today?',
        'type-message': 'Type your message...',
        'send': 'Send',

        // New - Profile Page
        'tasks-today': 'Tasks Today',
        'team-size': 'Team Size',
        'total-earned': 'Total Earned',
        'account-info': 'Account Information',
        'user-id': 'User ID',
        'invitation-code': 'Invitation Code',
        'member-since': 'Member Since',
        'account-status': 'Account Status',
        'active': 'Active',
        'quick-actions': 'Quick Actions',
        'bind-details': 'Bind Details',
        'bind-details-desc': 'Link your payment account',
        'team-management-desc': 'Manage your team',
        'withdrawal-records': 'Withdrawal Records',
        'withdrawal-records-desc': 'View transaction history',
        'language-desc': 'Change app language',
        'rewards-info': 'Rewards Information',
        'rewards-info-desc': 'View earning rules',
        'privacy-policy': 'Privacy Policy',
        'privacy-policy-desc': 'View privacy terms',
        'logout': 'Logout',

        // New - Level Page
        'levels-title': 'Levels',
        'levels-nav': 'Levels',
        'per-order': 'Per Order',
        'daily-tasks-label': 'Daily Tasks',
        'amount-label': 'Amount',
        'enroll-now': 'Enroll Now',

        // New - Login/Auth
        'login-title': 'CIC - Login',
        'welcome-success': 'Welcome to Success',
        'enter-phone': '+CountryCode - Please enter your phone number',
        'enter-password': 'Please enter login password',
        'remember-me': 'Remember username/password',
        'forgot-password': 'Forgot password?',
        'login': 'Login',
        'register': 'Register',
        'no-account': 'Don\'t have an account?',
        'register-alt': 'Register',

        // New - Task Page (Extended)
        'task-limit-title': 'Daily Task Limit',
        'task-limit-desc': 'Complete tasks to earn',
        'level-reward': 'Level Reward',
        'daily-task-limit': 'Daily Task Limit',
        'per-order-commission': 'Commission',
        'search-placeholder': 'Search tasks',
        'all-tasks': 'All Tasks',
        'pending': 'Pending',
        'filter-all': 'All',
        'filter-pending': 'Pending',
        'filter-completed': 'Completed',
        'notification-title': 'Task Notification',
        'quiz-title': 'Quick Quiz',
        'price': 'Price',
        'remaining': 'Remaining',

        // Benefits Page
        'benefits-title': 'CIC Benefits - Exclusive Member Advantages',
        'exclusive-benefits': 'Exclusive Benefits',
        'why-choose-cic': 'Why Choose CIC?',
        'why-choose-cic-desc': 'Discover the exclusive advantages that make CIC the premier platform for earning, investing, and building your financial future.',
        'daily-earnings-title': 'Daily Earnings',
        'daily-earnings-desc': 'Complete simple tasks and earn money every day with our innovative reward system.',
        'benefit-daily-1': 'KES 11+ per task',
        'benefit-daily-2': 'Multiple earning levels',
        'benefit-daily-3': 'Instant payments',
        'benefit-daily-4': 'No minimum withdrawal',
        'investment-growth-title': 'Investment Growth',
        'investment-growth-desc': 'Grow your wealth with our secure investment opportunities and compound returns.',
        'team-building-title': 'Team Building',
        'team-building-desc': 'Build your network and earn commissions from your team\'s activities and investments.',

        // Notifications Page
        'notifications-header': 'Notifications',
        'no-notifications': 'No notifications',
        'failed-load-notif': 'Failed to load notifications',

        // Withdrawal Page
        'important-info': '⚠️ Important Information',
        'min-withdrawal-info': '• Minimum withdrawal: ',
        'mpesa-info': '• M-Pesa withdrawals: Instant processing',
        'bank-info': '• Bank transfers: 24-48 hours',
        'details-info': '• Make sure your payment details are correct',
        'select-bank': 'Select Your Bank',
        'choose-bank': 'Choose bank',
        'account-placeholder': 'e.g., 0712345678 or Account No.',
        'processing-title': 'Processing',
        'wait-message': 'Please wait...',
        'insufficient-balance': 'Insufficient balance',
        'min-withdrawal-err': 'Minimum withdrawal is ',
        'withdrawal-request-submitted': 'Withdrawal request submitted successfully.',
        'mpesa-success-msg': ' Money will be sent to your account shortly.',
        'bank-success-msg': ' Processing time: 24-48 hours.',

        // Task Page (Extra)
        'holiday-notice': 'Holiday Notice',
        'tasks-restricted': 'Tasks Restricted',
        'no-tasks-found': 'No tasks found',
        'loading-tasks': 'Loading tasks...',
        'error-loading-tasks': 'Error loading tasks',

        // Team Management
        'team-management-title': 'Team Management - CIC',
        'team-management-header': 'Team Management',
        'team-size': 'Team Size',
        'your-invitation-code': 'Your Invitation Code',
        'copy-code': 'Copy Code',
        'referral-link-label': 'Referral Link',
        'copy-link': 'Copy Link',
        'share-link-msg': 'Share this link with your friends to invite them!',
        'qr-code-label': 'QR Code',
        'scan-qr-msg': 'Scan this QR code to join with your invitation code',
        'direct-team-members': 'Your Direct Team Members',
        'refresh': 'Refresh',
        'loading-team': 'Loading team members...',
        'registration-info': 'Members here registered using your invitation code.',
        'name': 'Name',
        'phone': 'Phone',
        'joined': 'Joined',

        // Withdrawal Records
        'withdrawal-records-title': 'Withdrawal Records - CIC',
        'withdrawal-records-header': 'Withdrawal Records',
        'total-withdrawn-label': 'Total Withdrawn',
        'this-month-label': 'This Month',
        'transaction-history': 'Transaction History',
        'no-records-found': 'No records found',

        // Task Records
        'task-records-title': 'Task Records - CIC',
        'task-records-header': 'Task Records',
        'completed-today-label': 'Completed Today',
        'correct-answers-label': 'Correct Answers',
        'total-earned-label': 'Total Earned',
        'success-rate-label': 'Success Rate',
        'task-history': 'Task History',
        'today': 'Today',
        'no-task-records': 'No task records yet',

        // Withdrawal Status
        'withdrawal-status-title': 'Withdrawal Status - CIC',
        'withdrawal-status-header': 'Withdrawal Status',
        'no-withdrawal-title': 'No Withdrawal in Progress',
        'no-withdrawal-msg': 'You don\'t have any active withdrawal requests',
        'loading-status': 'Loading status...',
        'withdrawal-details-header': 'Withdrawal Details',
        'refresh-status': '🔄 Refresh Status',
        'back-to-withdrawal': '← Back to Withdrawal',
        'pending-review': 'Pending Review',
        'disbursement-progress': 'Disbursement in Progress',
        'amt-label': 'Amount:',
        'requested-label': 'Requested:',
        'elapsed-label': 'Time Elapsed:',
        'rejected-by-label': 'Rejected by:',
        'admin-notes-label': 'Admin Notes:',

        // Payment Portal
        'payment-portal-title': 'M-Pesa Payment Portal',
        'secure-payment': 'Secure Payment',
        'complete-payment': 'Complete Your Payment',
        'pay-securely-desc': 'Pay securely with M-Pesa mobile money',
        'amount-kes': 'Amount (KES)',
        'mpesa-phone-number': 'M-Pesa Phone Number',
        'phone-help-text': 'Enter your M-Pesa registered phone number (supports +254, 07, 01 formats)',
        'pay-with-mpesa': 'Pay with M-Pesa',
        'powered-by': 'Powered by M-Pesa',
        'instant-payment': 'Instant Payment',
        'secure-safe': 'Secure & Safe',
        'mobile-money': 'Mobile Money',
        'stk-push-sent': 'STK Push Sent!',
        'stk-check-phone': 'Please check your phone and enter your M-Pesa PIN to complete the payment',
        'status-label': 'Status:',
        'waiting-pin': 'Waiting for PIN...',
        'cancel-payment': 'Cancel Payment',
        'payment-successful': 'Payment Successful!',
        'payment-processed-msg': 'Your payment has been processed successfully.',
        'transaction-id-label': 'Transaction ID:',
        'date-label': 'Date:',
        'close': 'Close',
        'payment-failed': 'Payment Failed',
        'payment-error-msg': 'There was an error processing your payment. Please try again.',
        'try-again': 'Try Again',

        // Team Task Earnings
        'team-task-earnings-title': 'Team Task Earnings - CIC',
        'team-task-earnings-header': 'Team Task Earnings',
        'team-earnings-estimate': 'Team Earnings (estimate)',

        // Temporary Workers
        'temp-workers-title': 'Temporary Workers - CIC',
        'temp-workers-header': 'Temporary Workers',
        'manage-temp-workers-desc': 'Manage temporary workers and their assignments',
        'loading-temp-worker-info': 'Loading temporary worker information...',
        'temp-workers-mgmt-header': 'Temporary Workers Management',
        'temp-workers-mgmt-desc': 'This section allows you to manage temporary workers, assign tasks, and track their performance during their temporary employment period.',
        'worker-mgmt-title': 'Worker Management',
        'worker-mgmt-desc': 'Add, remove, and manage temporary workers with their specific time-limited contracts.',
        'task-assignment-title': 'Task Assignment',
        'task-assignment-desc': 'Assign specific tasks to temporary workers and track their completion status.',
        'time-tracking-title': 'Time Tracking',
        'time-tracking-desc': 'Monitor working hours and contract duration for each temporary worker.',
        'performance-analytics-title': 'Performance Analytics',
        'performance-analytics-desc': 'Analyze temporary worker performance and productivity metrics.',
        'temp-worker-status-header': 'Temporary Worker Status',
        'temp-worker-status-desc': 'You are currently a temporary worker with limited access.',
        'days': 'Days',
        'hours': 'Hours',
        'minutes': 'Minutes',
        'upgrade-to-level-1': 'Upgrade to Level 1',
        'cost': 'Cost',
        'upgrade-now': 'Upgrade Now',
        'regular-user-header': 'Regular User',
        'regular-user-desc': 'You are not a temporary worker. You have full access to all features.',
        'trial-expired-header': 'Trial Period Expired',
        'trial-expired-desc': 'Your temporary worker trial has expired. Please upgrade to continue.',

        // Career Opportunities (Positions)
        'career-opp-title': 'Career Opportunities - CIC',
        'career-opp-header': 'Career Opportunities',
        'join-uai-team': '🚀 Join CIC Team',
        'build-career-desc': 'Build your career with us and earn up to KSh 545,000 monthly!<br>Start your journey today and grow with our expanding team.',
        'view-career-opp': 'View Career Opportunities',
        'career-progression-header': '📊 Career Progression & Salary Structure',
        'job-grade': 'Job Grade',
        'conditional-requirements': 'Conditional Requirements',
        'fixed-monthly-salary': 'Fixed Monthly Salary (KSh)',
        'internship-assistant': 'Internship Assistant',
        'intern-req': 'Team of 15 A-level subordinates who become regular employees',
        'formal-assistant': 'Formal Assistant',
        'formal-req': 'Team of 25 A-level subordinates who become regular employees',
        'senior-associate': 'Senior Associate',
        'senior-assoc-req': 'Team of 100 ABC-level people',
        'junior-supervisor': 'Junior Supervisor',
        'junior-sup-req': 'Team of 300 ABC-level people',
        'mid-level-supervisor': 'Mid-level Supervisor',
        'mid-sup-req': 'Team of 600 ABC-level people',
        'senior-executive': 'Senior Executive',
        'senior-exec-req': 'Team of 3,000 ABC-level subordinates',
        'why-join-uai': '🌟 Why Join CIC?',
        'competitive-salaries': 'Competitive Salaries',
        'comp-sal-desc': 'Earn up to KSh 545,000 monthly with our progressive salary structure based on team performance.',
        'career-growth': 'Career Growth',
        'career-growth-desc': 'Clear career progression path from Internship Assistant to Senior Executive with increasing responsibilities.',
        'global-opportunities': 'Global Opportunities',
        'global-opp-desc': 'Work with a global team and expand your network across different markets and cultures.',
        'performance-based': 'Performance Based',
        'perf-based-desc': 'Your success is directly tied to your team\'s performance, creating unlimited earning potential.',
        'leadership-development': 'Leadership Development',
        'leader-dev-desc': 'Develop leadership skills by managing and mentoring teams of various sizes.',
        'professional-training': 'Professional Training',
        'prof-train-desc': 'Access to comprehensive training programs to enhance your skills and knowledge.',
        'ready-start-journey': 'Ready to Start Your Journey?',
        'join-successful-desc': 'Join thousands of successful professionals who have built their careers with CIC.<br>Take the first step towards financial freedom and career growth!',
        'requirements-check': '📋 Requirements Check',
        'checking-auth': 'Checking authentication...',
        'checking-level-req': 'Checking level requirements...',
        'checking-team-size': 'Checking team size...',
        'checking-level-3': 'Checking Level 3 members...',
        'checking-level-4': 'Checking Level 4 members...',
        'join-uai-now': 'Join CIC Team Now',
        'we-are-amazed': 'We Are Amazed!',
        'congrats-met-req': 'Congratulations! You\'ve met all the requirements to join our team.<br><br>Please contact our HR Manager for further assistance and next steps.',
        'hr-manager-contact': 'HR Manager Contact:',
        'got-it': 'Got It!',

        // Download App
        'download-app': 'Download App',
        'download-app-desc': 'Get the official app',

        // Privacy Page
        'privacy-policy-title': 'Privacy Policy - CIC',
        'privacy-header': 'Privacy Policy',
        'cic-privacy-policy': 'CIC Privacy Policy',
        'last-updated': 'Last Updated: October 11, 2025',
        'privacy-intro-title': '1. Introduction',
        'privacy-intro-content': 'Welcome to CIC (Community Interest Company). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.',
        'privacy-collect-title': '2. Information We Collect',
        'privacy-collect-content': 'We collect the following types of information:',
        'privacy-collect-1': 'Personal identification information (Name, email, phone number)',
        'privacy-collect-2': 'Account credentials (Username, encrypted password)',
        'privacy-collect-3': 'Payment and financial information',
        'privacy-collect-4': 'Transaction history and earnings data',
        'privacy-collect-5': 'Device and usage information',
        'security-commitment-title': '🔒 Security Commitment:',
        'security-commitment-msg': 'We use industry-standard encryption and security measures to protect your personal and financial information.',
        'info': 'Information',
        'message': 'Message',
        'accept-terms': 'ACCEPT TERMS AND CONDITION',

        // Wealth Fund (Invest) Page
        'wealth-fund-title': 'Wealth Fund - CIC',
        'wealth-fund-header': 'Wealth Fund',
        'investment-plans-title': 'Investment Plans',
        'how-it-works-desc': 'Choose a plan, invest your funds, and earn daily returns. Your principal can be withdrawn after the investment period ends.',
        'no-investments': 'No active investments yet',
        'daily-return-label': 'Daily Return:',
        'duration-label': 'Duration:',
        'minimum-label': 'Minimum:',
        'enter-amount': 'Enter amount (minimum 100)',
        'invest-now': 'Invest Now',
        'popular': '⭐ Popular',
        'plan-desc-starter': 'Low barrier to entry, for first-time investors',
        'plan-desc-basic-200': 'Affordable investment option for steady growth',
        'plan-desc-standard-500': 'Standard investment plan with good returns',
        'plan-desc-bronze': 'Perfect for beginners looking to start their investment journey',
        'plan-desc-silver': 'Most popular choice with balanced risk and returns',
        'plan-desc-gold': 'Premium plan for serious investors seeking maximum returns',
        'plan-desc-platinum': 'High tier plan for experienced investors',
        'plan-desc-diamond': 'Top-tier exclusive plan with highest returns',
        'min-investment': 'Min Investment:',
        'days': 'Days',
        'no-investments-msg': 'No investments yet. Start investing to see your portfolio here.',
        'error-loading-investments': 'Error loading investments',

        // News Page
        'news-title': 'News - CIC',
        'news-header': 'News & Updates',
        'news-welcome-title': 'Welcome to CIC Platform!',
        'news-welcome-desc': 'We\'re excited to have you here. Start earning by completing tasks, building your team, and growing your wealth through our investment plans.',
        'news-tag-announcement': 'Announcement',
        'news-investment-title': 'New Investment Plans Available',
        'news-investment-desc': 'Check out our Bronze, Silver, and Gold investment plans with daily returns ranging from 1.5% to 2.5%. Start investing today!',
        'news-tag-investment': 'Investment',
        'news-task-title': 'Task System Updated',
        'news-task-desc': 'Our new quiz-based task system is now live! Answer questions correctly to earn rewards. Test your knowledge and grow your earnings.',
        'news-tag-update': 'Update',
        'news-rewards-title': 'Increased Task Rewards',
        'news-rewards-desc': 'We\'ve increased rewards across all levels! Level 5+ users can now earn up to KES 555 per task. Upgrade your level to maximize earnings.',
        'news-tag-rewards': 'Rewards',

        // Company Activities Page
        'company-activities-title': 'CIC company activities',
        'company-activities-header': 'Company Activities',
        'uai-company-activities': 'UAI Company Activities',
        'august-8-2019': 'August 8, 2019',
        'company-founded': '🏢 Company Founded',
        'company-founded-desc': 'UAI (United American Investments) was officially founded in Florida, USA. The company began with a vision to democratize investment opportunities and create financial freedom for people worldwide.',
        'initial-development': '🚀 Initial Development Phase',
        'initial-development-desc': 'Developed core investment platform and established first partnerships with financial institutions. Launched basic investment products and began building our user base.',
        'digital-platform-launch': '📱 Digital Platform Launch',
        'digital-platform-launch-desc': 'Launched our comprehensive digital platform featuring task management systems, user authentication, and basic investment tracking capabilities.',
        'global-expansion': '🌍 Global Expansion',
        'global-expansion-desc': 'Expanded operations internationally, supporting multiple languages and currencies. Established partnerships with banks and financial institutions worldwide.',
        'security-enhancements': '🔒 Security Enhancements',
        'security-enhancements-desc': 'Implemented advanced security measures including multi-factor authentication, encrypted transactions, and real-time fraud detection systems to protect user investments.',
        'wealth-fund-launch': '💎 UAI Wealth Fund Launch',
        'wealth-fund-launch-desc': 'Launched our comprehensive wealth management platform featuring 9 different investment funds including UAI Starter Fund, Micro Fund, Agriculture Fund, Tech Growth Fund, Real Estate Fund, Crypto Mining Fund, Wells Fargo & Citibank partnerships, Gold Investment Fund, and Diamond Elite Fund.',
        'present': 'Present',
        'current-activities': '🎯 Current Activities',
        'activity-1': 'Managing thousands of active user accounts worldwide',
        'activity-2': 'Processing millions in investment transactions',
        'activity-3': 'Expanding partnership network with major financial institutions',
        'activity-4': 'Developing new investment products and services',
        'activity-5': 'Enhancing platform security and user experience',
        'activity-6': 'Supporting multiple languages and currencies',
        'activity-7': 'Providing 24/7 customer support',
        'company-statistics': '📊 Company Statistics',
        'years-operation': 'Years of Operation',
        'global': 'Global',
        'market-presence': 'Market Presence',
        'investment-funds': 'Investment Funds',
        'customer-support': 'Customer Support'
      };

      // Swahili translations
      this.translations.sw = {
        // Navigation
        'home': 'Nyumbani',
        'tasks': 'Kazi',
        'level': 'Kiwango',
        'withdraw': 'Toa',
        'profile': 'Wasifu',
        'settings': 'Mipangilio',

        // Task Page
        'task-list-title': 'Orodha ya Kazi - CIC',
        'ongoing-label': 'Inaendelea',
        'all-label': 'Zote',
        'completed-label': 'Imekamilika',
        'start-task': 'Anza Kazi',
        'task-done': 'Kazi Imekamilika',
        'earn': 'Pata',
        'today': 'Leo',
        'balance': 'Salio',
        'streak': 'Mfululizo',
        'search-tasks': 'Tafuta kazi...',
        'refresh': 'Sasisha',
        'notifications': 'Arifa',
        'level': 'Kiwango',
        'completed': 'Imekamilika',

        // Withdrawal Page
        'withdrawal': 'Kutoa Pesa',
        'available-balance': 'Salio Lililopo',
        'withdraw-funds': 'Toa Pesa',
        'withdrawal-method': 'Njia ya Kutoa',
        'select-method': 'Chagua njia',
        'mpesa': 'M-Pesa',
        'bank-transfer': 'Uhamisho wa Benki',
        'airtel-money': 'Airtel Money',
        'phone-account': 'Nambari ya Simu / Akaunti',
        'amount': 'Kiasi',
        'request-withdrawal': 'Omba Kutoa',
        'recent-withdrawals': 'Kutoa Pesa za Hivi Karibuni',
        'no-history': 'Hakuna historia ya kutoa pesa',

        // Settings Page
        'account-management': 'Usimamizi wa Akaunti',
        'appearance': 'Muonekano',
        'language-regional': 'Lugha na Kanda',
        'notifications': 'Arifa',
        'privacy-security': 'Faragha na Usalama',
        'app-behavior': 'Tabia ya Programu',
        'advanced': 'Hali ya Juu',
        'theme': 'Mandhari',
        'light': 'Mwanga',
        'dark': 'Giza',
        'accent-color': 'Rangi ya Kipekee',
        'font-size': 'Ukubwa wa Herufi',
        'language': 'Lugha',
        'currency': 'Sarafu',
        'date-format': 'Muundo wa Tarehe',
        'push-notifications': 'Arifa za Kusukuma',
        'task-reminders': 'Ukumbusho wa Kazi',
        'payment-alerts': 'Arifa za Malipo',
        'marketing': 'Uuzaji',
        'two-factor': 'Uthibitishaji wa Mambo Mawi',
        'biometric-login': 'Kuingia kwa Kibiolojia',
        'auto-refresh': 'Sasisha Kiotomatiki',
        'haptic-feedback': 'Maoni ya Haptic',
        'debug-mode': 'Hali ya Utatuzi',

        // Common
        'save': 'Hifadhi',
        'cancel': 'Ghairi',
        'confirm': 'Thibitisha',
        'error': 'Hitilafu',
        'success': 'Mafanikio',
        'loading': 'Inapakia...',
        'processing': 'Inachakata...',
        'back': 'Rudi',
        'next': 'Ifuatayo',
        'done': 'Imekamilika',
        'ok': 'Sawa',
        'yes': 'Ndiyo',
        'no': 'Hapana',

        // New - Home Page
        'welcome-dashboard': 'Karibu kwenye dashibodi yako',
        'income-wallet': 'Pochi ya Mapato',
        'download-app': 'Pakua Programu',
        'get-mobile-app': 'Pata Programu ya Simu',
        'recharge': 'Jaza Salio',
        'invest': 'Wekeza',
        'quick-access': 'Ufikiaji wa Haraka',
        'team-management': 'Usimamizi wa Timu',
        'news': 'Habari',
        'benefits': 'Faida',
        'todays-performance': 'Utendaji wa Leo',
        'todays-earnings': 'Mapato ya Leo',
        'tasks-completed': 'Kazi Zilizokamilika',
        'team-members': 'Wanachama wa Timu',
        'total-earnings': 'Jumla ya Mapato',
        'powered-by': 'Imendeshwa na',
        'ai-assistant': 'Msaidizi wa AI',
        'ai-welcome': 'Hujambo! Mimi ni msaidizi wako wa AI. Ninawezaje kukusaidia leo?',
        'type-message': 'Andika ujumbe wako...',
        'send': 'Tuma',

        // New - Profile Page
        'tasks-today': 'Kazi za Leo',
        'team-size': 'Ukubwa wa Timu',
        'total-earned': 'Jumla Iliyopatikana',
        'account-info': 'Habari za Akaunti',
        'user-id': 'ID ya Mtumiaji',
        'invitation-code': 'Msimbo wa Mwaliko',
        'member-since': 'Mwanachama Tangu',
        'account-status': 'Hali ya Akaunti',
        'active': 'Amilifu',
        'quick-actions': 'Vitendo vya Haraka',
        'bind-details': 'Unganisha Maelezo',
        'bind-details-desc': 'Unganisha akaunti yako ya malipo',
        'team-management-desc': 'Dhibiti timu yako',
        'withdrawal-records': 'Rekodi za Kutoa',
        'withdrawal-records-desc': 'Angalia historia ya miamala',
        'language-desc': 'Badilisha lugha ya programu',
        'rewards-info': 'Habari za Zawadi',
        'rewards-info-desc': 'Angalia sheria za mapato',
        'privacy-policy': 'Sera ya Faragha',
        'privacy-policy-desc': 'Angalia masharti ya faragha',
        'logout': 'Ondoka',

        // Benefits Page (Swahili)
        'benefits-title': 'Faida za CIC - Manufaa ya Kipekee ya Wanachama',
        'exclusive-benefits': 'Faida za Kipekee',
        'why-choose-cic': 'Kwa Nini Uchague CIC?',
        'why-choose-cic-desc': 'Gundua manufaa ya kipekee yanayoifanya CIC kuwa jukwaa kuu la mapato, uwekezaji, na kujenga mustakabali wako wa kifedha.',
        'daily-earnings-title': 'Mapato ya Kila Siku',
        'daily-earnings-desc': 'Kamilisha kazi rahisi na upate pesa kila siku kwa mfumo wetu wa ubunifu wa zawadi.',
        'benefit-daily-1': 'KES 11+ kwa kila kazi',
        'benefit-daily-2': 'Viwango vingi vya mapato',
        'benefit-daily-3': 'Malipo ya papo hapo',
        'benefit-daily-4': 'Hakuna kiwango cha chini cha kutoa',
        'investment-growth-title': 'Ukuaji wa Uwekezaji',
        'investment-growth-desc': 'Kuza utajiri wako na fursa zetu za uwekezaji salama na mapato mchanganyiko.',
        'team-building-title': 'Ujenzi wa Timu',
        'team-building-desc': 'Jenga mtandao wako na upate kamisheni kutokana na shughuli na uwekezaji wa timu yako.',

        // Notifications Page (Swahili)
        'notifications-header': 'Arifa',
        'no-notifications': 'Hakuna arifa',
        'failed-load-notif': 'Imeshindwa kupakia arifa',

        // Withdrawal Page (Swahili)
        'important-info': '⚠️ Habari Muhimu',
        'min-withdrawal-info': '• Kiwango cha chini cha kutoa: ',
        'mpesa-info': '• Kutoa kwa M-Pesa: Usindikaji wa papo hapo',
        'bank-info': '• Uhamisho wa Benki: Saa 24-48',
        'details-info': '• Hakikisha maelezo yako ya malipo ni sahihi',
        'select-bank': 'Chagua Benki Yako',
        'choose-bank': 'Chagua benki',
        'account-placeholder': 'k.m., 0712345678 au Nambari ya Akaunti',
        'processing-title': 'Inachakata',
        'wait-message': 'Tafadhali subiri...',
        'insufficient-balance': 'Salio halitoshi',
        'min-withdrawal-err': 'Kiwango cha chini cha kutoa ni ',
        'withdrawal-request-submitted': 'Ombi la kutoa pesa limetumwa kwa mafanikio.',
        'mpesa-success-msg': ' Pesa zitatumwa kwenye akaunti yako hivi karibuni.',
        'bank-success-msg': ' Wakati wa usindikaji: Saa 24-48.',

        // Task Page (Swahili Extra)
        'holiday-notice': 'Ilani ya Likizo',
        'tasks-restricted': 'Kazi Zimezuiliwa',
        'no-tasks-found': 'Hakuna kazi zilizopatikana',
        'loading-tasks': 'Inapakia kazi...',
        'error-loading-tasks': 'Hitilafu wakati wa kupakia kazi',

        // Team Management (Swahili)
        'team-management-title': 'Usimamizi wa Timu - CIC',
        'team-management-header': 'Usimamizi wa Timu',
        'team-size': 'Ukubwa wa Timu',
        'your-invitation-code': 'Nambari Yako ya Mwaliko',
        'copy-code': 'Nakili Nambari',
        'referral-link-label': 'Kiungo cha Marejeleo',
        'copy-link': 'Nakili Kiungo',
        'share-link-msg': 'Shiriki kiungo hiki na marafiki zako ili uwaalike!',
        'qr-code-label': 'Nambari ya QR',
        'scan-qr-msg': 'Changanua nambari hii ya QR ili kujiunga na nambari yako ya mwaliko',
        'direct-team-members': 'Wanachama Wako wa Moja kwa Moja wa Timu',
        'refresh': 'Zidisha',
        'loading-team': 'Inapakia wanachama wa timu...',
        'registration-info': 'Wanachama hapa walijiandikisha kwa kutumia nambari yako ya mwaliko.',
        'name': 'Jina',
        'phone': 'Simu',
        'joined': 'Aliyejiunga',

        // Withdrawal Records (Swahili)
        'withdrawal-records-title': 'Kumbukumbu za Kutoa - CIC',
        'withdrawal-records-header': 'Kumbukumbu za Kutoa',
        'total-withdrawn-label': 'Jumla Iliyotolewa',
        'this-month-label': 'Mwezi Huu',
        'transaction-history': 'Historia ya Muamala',
        'no-records-found': 'Hakuna kumbukumbu zilizopatikana',

        // Task Records (Swahili)
        'task-records-title': 'Kumbukumbu za Kazi - CIC',
        'task-records-header': 'Kumbukumbu za Kazi',
        'completed-today-label': 'Iliyekamilika Leo',
        'correct-answers-label': 'Majibu Sahihi',
        'total-earned-label': 'Jumla ya Mapato',
        'success-rate-label': 'Kiwango cha Mafanikio',
        'task-history': 'Historia ya Kazi',
        'today': 'Leo',
        'no-task-records': 'Hakuna kumbukumbu za kazi bado',

        // Withdrawal Status (Swahili)
        'withdrawal-status-title': 'Hali ya Kutoa - CIC',
        'withdrawal-status-header': 'Hali ya Kutoa',
        'no-withdrawal-title': 'Hakuna Kutoa Kunakoendelea',
        'no-withdrawal-msg': 'Huna maombi yoyote ya kutoa yanayoendelea',
        'loading-status': 'Inapakia hali...',
        'withdrawal-details-header': 'Maelezo ya Kutoa',
        'refresh-status': '🔄 Zidisha Hali',
        'back-to-withdrawal': '← Rudi kwenye Kutoa',
        'pending-review': 'Mapitio Yanayosubiri',
        'disbursement-progress': 'Utoaji Unaendelea',
        'amt-label': 'Kiasi:',
        'requested-label': 'Iliyoombwa:',
        'elapsed-label': 'Muda Uliopita:',
        'rejected-by-label': 'Imekataliwa na:',
        'admin-notes-label': 'Maelezo ya Msimamizi:',

        // Payment Portal (Swahili)
        'payment-portal-title': 'Lango la Malipo la M-Pesa',
        'secure-payment': 'Malipo Salama',
        'complete-payment': 'Kamilisha Malipo Yako',
        'pay-securely-desc': 'Lipa kwa usalama kwa pesa ya simu ya M-Pesa',
        'amount-kes': 'Kiasi (KES)',
        'mpesa-phone-number': 'Nambari ya Simu ya M-Pesa',
        'phone-help-text': 'Ingiza nambari yako ya simu iliyosajiliwa na M-Pesa (inatumia fomati za +254, 07, 01)',
        'pay-with-mpesa': 'Lipa na M-Pesa',
        'powered-by': 'Inaendeshwa na M-Pesa',
        'instant-payment': 'Malipo ya Papo hapo',
        'secure-safe': 'Salama na Uhakika',
        'mobile-money': 'Pesa ya Simu',
        'stk-push-sent': 'STK Push Imetumwa!',
        'stk-check-phone': 'Tafadhali angalia simu yako na uingize PIN yako ya M-Pesa ili kukamilisha malipo',
        'status-label': 'Hali:',
        'waiting-pin': 'Inasubiri PIN...',
        'cancel-payment': 'Ghairi Malipo',
        'payment-successful': 'Malipo Yamefanikiwa!',
        'payment-processed-msg': 'Malipo yako yamefanyiwa kazi kwa mafanikio.',
        'transaction-id-label': 'Nambari ya Muamala:',
        'date-label': 'Tarehe:',
        'close': 'Funga',
        'payment-failed': 'Malipo Yameshindwa',
        'payment-error-msg': 'Kulikuwa na hitilafu wakati wa kuchakata malipo yako. Tafadhali jaribu tena.',
        'try-again': 'Jaribu Tena',

        // Team Task Earnings (Swahili)
        'team-task-earnings-title': 'Mapato ya Kazi ya Timu - CIC',
        'team-task-earnings-header': 'Mapato ya Kazi ya Timu',
        'team-earnings-estimate': 'Mapato ya Timu (makadirio)',

        // Temporary Workers (Swahili)
        'temp-workers-title': 'Wafanyakazi wa Muda - CIC',
        'temp-workers-header': 'Wafanyakazi wa Muda',
        'manage-temp-workers-desc': 'Simamia wafanyakazi wa muda na kazi zao',
        'loading-temp-worker-info': 'Inapakia habari za mfanyakazi wa muda...',
        'temp-workers-mgmt-header': 'Usimamizi wa Wafanyakazi wa Muda',
        'temp-workers-mgmt-desc': 'Sehemu hii hukuruhusu kusimamia wafanyakazi wa muda, kugawa kazi, na kufuatilia utendaji wao wakati wa kipindi chao cha ajira ya muda.',
        'worker-mgmt-title': 'Usimamizi wa Wafanyakazi',
        'worker-mgmt-desc': 'Ongeza, ondoa, na usimamie wafanyakazi wa muda na mikataba yao maalum ya muda.',
        'task-assignment-title': 'Mgawanyo wa Kazi',
        'task-assignment-desc': 'Gawa kazi maalum kwa wafanyakazi wa muda na ufuatilie hali yao ya ukamilishaji.',
        'time-tracking-title': 'Ufuatiliaji wa Muda',
        'time-tracking-desc': 'Fuatilia saa za kazi na muda wa mkataba kwa kila mfanyakazi wa muda.',
        'performance-analytics-title': 'Uchambuzi wa Utendaji',
        'performance-analytics-desc': 'Chambua utendaji wa mfanyakazi wa muda na vipimo vya tija.',
        'temp-worker-status-header': 'Hali ya Mfanyakazi wa Muda',
        'temp-worker-status-desc': 'Hivi sasa wewe ni mfanyakazi wa muda na ufikiaji mdogo.',
        'days': 'Siku',
        'hours': 'Saa',
        'minutes': 'Dakika',
        'upgrade-to-level-1': 'Boresha hadi Ngazi ya 1',
        'cost': 'Gharama',
        'upgrade-now': 'Boresha Sasa',
        'regular-user-header': 'Mtumiaji wa Kawaida',
        'regular-user-desc': 'Wewe si mfanyakazi wa muda. Una ufikiaji kamili wa huduma zote.',
        'trial-expired-header': 'Kipindi cha Majaribio Kimeisha',
        'trial-expired-desc': 'Majaribio yako ya mfanyakazi wa muda yameisha. Tafadhali boresha ili kuendelea.',

        // Career Opportunities (Positions - Swahili)
        'career-opp-title': 'Nafasi za Kazi - CIC',
        'career-opp-header': 'Nafasi za Kazi',
        'join-uai-team': '🚀 Jiunge na Timu ya CIC',
        'build-career-desc': 'Jenga kazi yako nasi na upate hadi KSh 545,000 kila mwezi!<br>Anza safari yako leo na ukue na timu yetu inayopanuka.',
        'view-career-opp': 'Angalia Nafasi za Kazi',
        'career-progression-header': '📊 Maendeleo ya Kazi na Muundo wa Mishahara',
        'job-grade': 'Daraja la Kazi',
        'conditional-requirements': 'Mahitaji ya Masharti',
        'fixed-monthly-salary': 'Mshahara wa Kila Mwezi Usiobadilika (KSh)',
        'internship-assistant': 'Msaidizi wa Mafunzo',
        'intern-req': 'Timu ya wasaidizi 15 wa ngazi ya A ambao wanakuwa wafanyakazi wa kawaida',
        'formal-assistant': 'Msaidizi Rasmi',
        'formal-req': 'Timu ya wasaidizi 25 wa ngazi ya A ambao wanakuwa wafanyakazi wa kawaida',
        'senior-associate': 'Mshirika Mkuu',
        'senior-assoc-req': 'Timu ya watu 100 wa ngazi ya ABC',
        'junior-supervisor': 'Msimamizi Mdogo',
        'junior-sup-req': 'Timu ya watu 300 wa ngazi ya ABC',
        'mid-level-supervisor': 'Msimamizi wa Ngazi ya Kati',
        'mid-sup-req': 'Timu ya watu 600 wa ngazi ya ABC',
        'senior-executive': 'Mkurugenzi Mkuu',
        'senior-exec-req': 'Timu ya wasaidizi 3,000 wa ngazi ya ABC',
        'why-join-uai': '🌟 Kwa nini Jiunge na CIC?',
        'competitive-salaries': 'Mishahara ya Ushindani',
        'comp-sal-desc': 'Pata hadi KSh 545,000 kila mwezi na muundo wetu wa mshahara unaoendelea kulingana na utendaji wa timu.',
        'career-growth': 'Ukuaji wa Kazi',
        'career-growth-desc': 'Njia wazi ya maendeleo ya kazi kutoka Msaidizi wa Mafunzo hadi Mkurugenzi Mkuu na majukumu yanayoongezeka.',
        'global-opportunities': 'Nafasi za Kimataifa',
        'global-opp-desc': 'Fanya kazi na timu ya kimataifa na upanue mtandao wako katika masoko na tamaduni tofauti.',
        'performance-based': 'Kulingana na Utendaji',
        'perf-based-desc': 'Mafanikio yako yamefungwa moja kwa moja na utendaji wa timu yako, ikitengeneza uwezo wa mapato usio na kikomo.',
        'leadership-development': 'Maendeleo ya Uongozi',
        'leader-dev-desc': 'Endeleza ujuzi wa uongozi kwa kusimamia na kushauri timu za saizi tofauti.',
        'professional-training': 'Mafunzo ya Kitaaluma',
        'prof-train-desc': 'Fikia mipango kamili ya mafunzo ili kuongeza ujuzi na maarifa yako.',
        'ready-start-journey': 'Tayari Kuanza Safari Yako?',
        'join-successful-desc': 'Jiunge na maelfu ya wataalamu waliofanikiwa ambao wamejenga kazi zao na CIC.<br>Chukua hatua ya kwanza kuelekea uhuru wa kifedha na ukuaji wa kazi!',
        'requirements-check': '📋 Uhakiki wa Mahitaji',
        'checking-auth': 'Inahakiki uthibitisho...',
        'checking-level-req': 'Inahakiki mahitaji ya ngazi...',
        'checking-team-size': 'Inahakiki ukubwa wa timu...',
        'checking-level-3': 'Inahakiki wanachama wa Ngazi ya 3...',
        'checking-level-4': 'Inahakiki wanachama wa Ngazi ya 4...',
        'join-uai-now': 'Jiunge na Timu ya CIC Sasa',
        'we-are-amazed': 'Tumestajabishwa!',
        'congrats-met-req': 'Hongera! Umetimiza mahitaji yote ya kujiunga na timu yetu.<br><br>Tafadhali wasiliana na Meneja wetu wa HR kwa msaada zaidi na hatua zinazofuata.',
        'hr-manager-contact': 'Mawasiliano ya Meneja wa HR:',
        'got-it': 'Nimeelewa!',

        // Download App (Swahili)
        'download-app': 'Pakua Programu',
        'download-app-desc': 'Pata programu rasmi',

        // New - Level Page
        // New - Level Page
        'levels-title': 'Viwango',
        'levels-nav': 'Viwango',
        'per-order': 'Kwa Agizo',
        'daily-tasks-label': 'Kazi za Kila Siku',
        'amount-label': 'Kiasi',
        'enroll-now': 'Jiandikishe Sasa',

        // New - Login/Auth
        'login-title': 'CIC - Ingia',
        'welcome-success': 'Karibu kwenye Mafanikio',
        'enter-phone': 'Tafadhali ingiza nambari yako ya simu',
        'enter-password': 'Tafadhali ingiza nenosiri la kuingia',
        'remember-me': 'Kumbuka jina la mtumiaji/nenosiri',
        'forgot-password': 'Umesahau nenosiri?',
        'login': 'Ingia',
        'register': 'Jisajili',
        'no-account': 'Hauna akaunti?',
        'register-alt': 'Jisajili',

        // New - Task Page (Extended)
        'task-limit-title': 'Kikomo cha Kazi cha Siku',
        'task-limit-desc': 'Kamilisha kazi ili upate pesa',
        'level-reward': 'Zawadi ya Kiwango',
        'daily-task-limit': 'Kikomo cha Kazi cha Siku',
        'per-order-commission': 'Kamisheni',
        'search-placeholder': 'Tafuta kazi',
        'all-tasks': 'Kazi Zote',
        'pending': 'Inasubiri',
        'filter-all': 'Zote',
        'filter-pending': 'Inasubiri',
        'filter-completed': 'Imekamilika',
        'notification-title': 'Arifa ya Kazi',
        'quiz-title': 'Maswali ya Haraka',
        'price': 'Bei',
        'remaining': 'Iliyobaki'
      };

      // French translations
      this.translations.fr = {
        // Navigation
        'home': 'Accueil',
        'tasks': 'Tâches',
        'level': 'Niveau',
        'withdraw': 'Retirer',
        'profile': 'Profil',
        'settings': 'Paramètres',

        // Task Page
        'task-list-title': 'Liste des Tâches - CIC',
        'ongoing-label': 'En cours',
        'all-label': 'Toutes',
        'completed-label': 'Terminées',
        'start-task': 'Commencer',
        'task-done': 'Terminé',
        'earn': 'Gagner',
        'today': 'Aujourd\'hui',
        'balance': 'Solde',
        'streak': 'Série',
        'search-tasks': 'Rechercher des tâches...',
        'refresh': 'Actualiser',
        'notifications': 'Notifications',
        'level': 'Niveau',
        'completed': 'Terminé',

        // Withdrawal Page
        'withdrawal': 'Retrait',
        'available-balance': 'Solde Disponible',
        'withdraw-funds': 'Retirer des Fonds',
        'withdrawal-method': 'Méthode de Retrait',
        'select-method': 'Sélectionner une méthode',
        'mpesa': 'M-Pesa',
        'bank-transfer': 'Virement Bancaire',
        'airtel-money': 'Airtel Money',
        'phone-account': 'Numéro de Téléphone / Compte',
        'amount': 'Montant',
        'request-withdrawal': 'Demander un Retrait',
        'recent-withdrawals': 'Retraits Récents',
        'no-history': 'Aucun historique de retrait',

        // Settings Page
        'account-management': 'Gestion du Compte',
        'appearance': 'Apparence',
        'language-regional': 'Langue et Région',
        'notifications': 'Notifications',
        'privacy-security': 'Confidentialité et Sécurité',
        'app-behavior': 'Comportement de l\'App',
        'advanced': 'Avancé',
        'theme': 'Thème',
        'light': 'Clair',
        'dark': 'Sombre',
        'accent-color': 'Couleur d\'Accent',
        'font-size': 'Taille de Police',
        'language': 'Langue',
        'currency': 'Devise',
        'date-format': 'Format de Date',
        'push-notifications': 'Notifications Push',
        'task-reminders': 'Rappels de Tâches',
        'payment-alerts': 'Alertes de Paiement',
        'marketing': 'Marketing',
        'two-factor': 'Authentification à Deux Facteurs',
        'biometric-login': 'Connexion Biométrique',
        'auto-refresh': 'Actualisation Automatique',
        'haptic-feedback': 'Retour Haptique',
        'debug-mode': 'Mode Débogage',

        // Common
        'save': 'Enregistrer',
        'cancel': 'Annuler',
        'confirm': 'Confirmer',
        'error': 'Erreur',
        'success': 'Succès',
        'loading': 'Chargement...',
        'processing': 'Traitement...',
        'back': 'Retour',
        'next': 'Suivant',
        'done': 'Terminé',
        'ok': 'OK',
        'yes': 'Oui',
        'no': 'Non',

        // New - Home Page
        'welcome-dashboard': 'Bienvenue sur votre tableau de bord',
        'income-wallet': 'Portefeuille de Revenus',
        'download-app': 'Télécharger l\'Application',
        'get-mobile-app': 'Obtenir l\'App Mobile',
        'recharge': 'Recharger',
        'invest': 'Investir',
        'quick-access': 'Accès Rapide',
        'team-management': 'Gestion d\'Équipe',
        'news': 'Actualités',
        'benefits': 'Avantages',
        'todays-performance': 'Performance d\'Aujourd\'hui',
        'todays-earnings': 'Gains d\'Aujourd\'hui',
        'tasks-completed': 'Tâches Terminées',
        'team-members': 'Membres de l\'Équipe',
        'total-earnings': 'Gains Totaux',
        'powered-by': 'Propulsé par',
        'ai-assistant': 'Assistant IA',
        'ai-welcome': 'Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd\'hui ?',
        'type-message': 'Tapez votre message...',
        'send': 'Envoyer',

        // New - Profile Page
        'tasks-today': 'Tâches d\'Aujourd\'hui',
        'team-size': 'Taille de l\'Équipe',
        'total-earned': 'Total Gagné',
        'account-info': 'Informations du Compte',
        'user-id': 'ID Utilisateur',
        'invitation-code': 'Code d\'Invitation',
        'member-since': 'Membre Depuis',
        'account-status': 'Statut du Compte',
        'active': 'Actif',
        'quick-actions': 'Actions Rapides',
        'bind-details': 'Lier les Détails',
        'bind-details-desc': 'Lier votre compte de paiement',
        'team-management-desc': 'Gérer votre équipe',
        'withdrawal-records': 'Historique des Retraits',
        'withdrawal-records-desc': 'Voir l\'historique des transactions',
        'language-desc': 'Changer la langue de l\'app',
        'rewards-info': 'Infos Récompenses',
        'rewards-info-desc': 'Voir les règles de gains',
        'privacy-policy': 'Politique de Confidentialité',
        'privacy-policy-desc': 'Voir les conditions de confidentialité',
        'logout': 'Déconnexion',

        // New - Level Page
        'levels-title': 'Niveaux',
        'levels-nav': 'Niveaux',
        'per-order': 'Par Commande',
        'daily-tasks-label': 'Tâches Quotidiennes',
        'amount-label': 'Montant',
        'enroll-now': 'S\'inscrire Maintenant',

        // New - Login/Auth
        'login-title': 'CIC - Connexion',
        'welcome-success': 'Bienvenue au Succès',
        'enter-phone': 'Veuillez entrer votre numéro de téléphone',
        'enter-password': 'Veuillez entrer votre mot de passe',
        'remember-me': 'Se souvenir de moi',
        'forgot-password': 'Mot de passe oublié ?',
        'login-btn': 'Connexion',
        'register': 'S\'inscrire',
        'no-account': 'Vous n\'avez pas de compte ?',
        'register-link': 'S\'inscrire',

        // New - Task Page (Extended)
        'task-limit-title': 'Limite de Tâches Quotidienne',
        'task-limit-desc': 'Complétez des tâches pour gagner',
        'level-reward': 'Récompense de Niveau',
        'daily-task-limit': 'Limite de Tâches Quotidienne',
        'per-order-commission': 'Commission',
        'search-placeholder': 'Rechercher des tâches',
        'all-tasks': 'Toutes les Tâches',
        'pending': 'En Attente',
        'filter-all': 'Toutes',
        'filter-pending': 'En Attente',
        'filter-completed': 'Terminé',
        'notification-title': 'Notification de Tâche',
        'quiz-title': 'Quiz Rapide',
        'price': 'Prix',
        'remaining': 'Restant'
      };

      // Arabic translations
      this.translations.ar = {
        // Navigation
        'home': 'الرئيسية',
        'tasks': 'المهام',
        'level': 'المستوى',
        'withdraw': 'سحب',
        'profile': 'الملف الشخصي',
        'settings': 'الإعدادات',

        // Task Page
        'task-list-title': 'قائمة المهام - CIC',
        'ongoing-label': 'جاري',
        'all-label': 'الكل',
        'completed-label': 'مكتمل',
        'start-task': 'بدء المهمة',
        'task-done': 'تمت المهمة',
        'earn': 'اكسب',
        'today': 'اليوم',
        'balance': 'الرصيد',
        'streak': 'السلسلة',
        'search-tasks': 'البحث في المهام...',
        'refresh': 'تحديث',
        'notifications': 'الإشعارات',
        'level': 'المستوى',
        'completed': 'مكتمل',

        // Withdrawal Page
        'withdrawal': 'السحب',
        'available-balance': 'الرصيد المتاح',
        'withdraw-funds': 'سحب الأموال',
        'withdrawal-method': 'طريقة السحب',
        'select-method': 'اختر الطريقة',
        'mpesa': 'M-Pesa',
        'bank-transfer': 'تحويل بنكي',
        'airtel-money': 'Airtel Money',
        'phone-account': 'رقم الهاتف / الحساب',
        'amount': 'المبلغ',
        'request-withdrawal': 'طلب السحب',
        'recent-withdrawals': 'عمليات السحب الأخيرة',
        'no-history': 'لا يوجد تاريخ سحب',

        // Settings Page
        'account-management': 'إدارة الحساب',
        'appearance': 'المظهر',
        'language-regional': 'اللغة والمنطقة',
        'notifications': 'الإشعارات',
        'privacy-security': 'الخصوصية والأمان',
        'app-behavior': 'سلوك التطبيق',
        'advanced': 'متقدم',
        'theme': 'المظهر',
        'light': 'فاتح',
        'dark': 'داكن',
        'accent-color': 'لون التمييز',
        'font-size': 'حجم الخط',
        'language': 'اللغة',
        'currency': 'العملة',
        'date-format': 'تنسيق التاريخ',
        'push-notifications': 'الإشعارات الفورية',
        'task-reminders': 'تذكيرات المهام',
        'payment-alerts': 'تنبيهات الدفع',
        'marketing': 'التسويق',
        'two-factor': 'المصادقة الثنائية',
        'biometric-login': 'تسجيل الدخول البيومتري',
        'auto-refresh': 'التحديث التلقائي',
        'haptic-feedback': 'التغذية الراجعة اللمسية',
        'debug-mode': 'وضع التصحيح',

        // Common
        'save': 'حفظ',
        'cancel': 'إلغاء',
        'confirm': 'تأكيد',
        'error': 'خطأ',
        'success': 'نجح',
        'loading': 'جاري التحميل...',
        'processing': 'جاري المعالجة...',
        'back': 'رجوع',
        'next': 'التالي',
        'done': 'تم',
        'ok': 'موافق',
        'yes': 'نعم',
        'no': 'لا',

        // New - Home Page
        'welcome-dashboard': 'مرحبًا بك في لوحة القيادة الخاصة بك',
        'income-wallet': 'محفظة الدخل',
        'download-app': 'تنزيل التطبيق',
        'get-mobile-app': 'احصل على تطبيق الهاتف المحمول',
        'recharge': 'إعادة شحن',
        'invest': 'استثمار',
        'quick-access': 'الوصول السريع',
        'team-management': 'إدارة الفريق',
        'news': 'أخبار',
        'benefits': 'فوائد',
        'todays-performance': 'أداء اليوم',
        'todays-earnings': 'أرباح اليوم',
        'tasks-completed': 'المهام المكتملة',
        'team-members': 'أعضاء الفريق',
        'total-earnings': 'إجمالي الأرباح',
        'powered-by': 'مشغل بواسطة',
        'ai-assistant': 'مساعد AI',
        'ai-welcome': 'مرحبًا! أنا مساعد الذكاء الاصطناعي الخاص بك. كيف يمكنني مساعدتك اليوم؟',
        'type-message': 'اكتب رسالتك...',
        'send': 'إرسال',

        // New - Profile Page
        'tasks-today': 'مهام اليوم',
        'team-size': 'حجم الفريق',
        'total-earned': 'المكتسب الإجمالي',
        'account-info': 'معلومات الحساب',
        'user-id': 'معرف المستخدم',
        'invitation-code': 'رمز الدعوة',
        'member-since': 'عضو منذ',
        'account-status': 'حالة الحساب',
        'active': 'نشط',
        'quick-actions': 'إجراءات سريعة',
        'bind-details': 'ربط التفاصيل',
        'bind-details-desc': 'ربط حساب الدفع الخاص بك',
        'team-management-desc': 'إدارة فريقك',
        'withdrawal-records': 'سجلات السحب',
        'withdrawal-records-desc': 'عرض سجل المعاملات',
        'language-desc': 'تغيير لغة التطبيق',
        'rewards-info': 'معلومات المكافآت',
        'rewards-info-desc': 'عرض قواعد الكسب',
        'privacy-policy': 'سياسة الخصوصية',
        'privacy-policy-desc': 'عرض شروط الخصوصية',
        'logout': 'تسجيل الخروج',

        // New - Level Page
        'levels-title': 'المستويات',
        'levels-nav': 'مستويات',
        'per-order': 'لكل طلب',
        'daily-tasks-label': 'المهام اليومية',
        'amount-label': 'المبلغ',
        'enroll-now': 'سجل الآن',

        // New - Login/Auth
        'login-title': 'CIC - تسجيل الدخول',
        'welcome-success': 'مرحبًا بك في النجاح',
        'enter-phone': 'الرجاء إدخال رقم هاتفك',
        'enter-password': 'الرجاء إدخال كلمة مرور تسجيل الدخول',
        'remember-me': 'تذكر اسم المستخدم/كلمة المرور',
        'forgot-password': 'نسيت كلمة المرور؟',
        'login-btn': 'تسجيل الدخول',
        'register': 'تسجيل',
        'no-account': 'ليس لديك حساب؟',
        'register-link': 'تسجيل',

        // New - Task Page (Extended)
        'task-limit-title': 'حد المهام اليومية',
        'task-limit-desc': 'إكمال المهام للكسب',
        'level-reward': 'مكافأة المستوى',
        'daily-task-limit': 'حد المهام اليومية',
        'per-order-commission': 'عمولة',
        'search-placeholder': 'البحث في المهام',
        'all-tasks': 'جميع المهام',
        'pending': 'قيد الانتظار',
        'filter-all': 'الكل',
        'filter-pending': 'قيد الانتظار',
        'filter-completed': 'مكتمل',
        'notification-title': 'إشعار المهمة',
        'quiz-title': 'اختبار سريع',
        'price': 'سعر',
        'remaining': 'المتبقي'
      };

      // Hindi translations
      this.translations.hi = {
        // Navigation
        'home': 'होम',
        'tasks': 'कार्य',
        'level': 'स्तर',
        'withdraw': 'निकासी',
        'profile': 'प्रोफ़ाइल',
        'settings': 'सेटिंग्स',

        // Task Page
        'task-list-title': 'कार्य सूची - CIC',
        'ongoing-label': 'चल रहा',
        'all-label': 'सभी',
        'completed-label': 'पूर्ण',
        'start-task': 'कार्य शुरू करें',
        'task-done': 'कार्य पूर्ण',
        'earn': 'कमाएं',
        'today': 'आज',
        'balance': 'बैलेंस',
        'streak': 'स्ट्रीक',
        'search-tasks': 'कार्य खोजें...',
        'refresh': 'रिफ्रेश',
        'notifications': 'सूचनाएं',
        'level': 'स्तर',
        'completed': 'पूर्ण',

        // Withdrawal Page
        'withdrawal': 'निकासी',
        'available-balance': 'उपलब्ध बैलेंस',
        'withdraw-funds': 'फंड निकालें',
        'withdrawal-method': 'निकासी विधि',
        'select-method': 'विधि चुनें',
        'mpesa': 'M-Pesa',
        'bank-transfer': 'बैंक ट्रांसफर',
        'airtel-money': 'Airtel Money',
        'phone-account': 'फोन नंबर / खाता',
        'amount': 'राशि',
        'request-withdrawal': 'निकासी अनुरोध',
        'recent-withdrawals': 'हाल की निकासी',
        'no-history': 'कोई निकासी इतिहास नहीं',

        // Settings Page
        'account-management': 'खाता प्रबंधन',
        'appearance': 'दिखावट',
        'language-regional': 'भाषा और क्षेत्र',
        'notifications': 'सूचनाएं',
        'privacy-security': 'गोपनीयता और सुरक्षा',
        'app-behavior': 'ऐप व्यवहार',
        'advanced': 'उन्नत',
        'theme': 'थीम',
        'light': 'हल्का',
        'dark': 'गहरा',
        'accent-color': 'एक्सेंट रंग',
        'font-size': 'फॉन्ट आकार',
        'language': 'भाषा',
        'currency': 'मुद्रा',
        'date-format': 'दिनांक प्रारूप',
        'push-notifications': 'पुश सूचनाएं',
        'task-reminders': 'कार्य अनुस्मारक',
        'payment-alerts': 'भुगतान अलर्ट',
        'marketing': 'मार्केटिंग',
        'two-factor': 'दो-कारक प्रमाणीकरण',
        'biometric-login': 'बायोमेट्रिक लॉगिन',
        'auto-refresh': 'ऑटो रिफ्रेश',
        'haptic-feedback': 'हैप्टिक फीडबैक',
        'debug-mode': 'डिबग मोड',

        // Common
        'save': 'सहेजें',
        'cancel': 'रद्द करें',
        'confirm': 'पुष्टि करें',
        'error': 'त्रुटि',
        'success': 'सफलता',
        'loading': 'लोड हो रहा है...',
        'processing': 'प्रसंस्करण...',
        'back': 'वापस',
        'next': 'अगला',
        'done': 'हो गया',
        'ok': 'ठीक',
        'yes': 'हां',
        'no': 'नहीं',

        // New - Home Page
        'welcome-dashboard': 'अपने डैशबोर्ड में आपका स्वागत है',
        'income-wallet': 'आय वॉलेट',
        'download-app': 'ऐप डाउनलोड करें',
        'get-mobile-app': 'मोबाइल ऐप प्राप्त करें',
        'recharge': 'रिचार्ज',
        'invest': 'निवेश करें',
        'quick-access': 'त्वरित पहुँच',
        'team-management': 'टीम प्रबंधन',
        'news': 'समाचार',
        'benefits': 'लाभ',
        'todays-performance': 'आज का प्रदर्शन',
        'todays-earnings': 'आज की कमाई',
        'tasks-completed': 'पूर्ण कार्य',
        'team-members': 'टीम के सदस्य',
        'total-earnings': 'कुल कमाई',
        'powered-by': 'द्वारा संचालित',
        'ai-assistant': 'AI सहायक',
        'ai-welcome': 'नमस्ते! मैं आपका AI सहायक हूँ। आज मैं आपकी कैसे मदद कर सकता हूँ?',
        'type-message': 'अपना संदेश लिखें...',
        'send': 'भेजें',

        // New - Profile Page
        'tasks-today': 'आज के कार्य',
        'team-size': 'टीम का आकार',
        'total-earned': 'कुल अर्जित',
        'account-info': 'खाता जानकारी',
        'user-id': 'उपयोगकर्ता आईडी',
        'invitation-code': 'आमंत्रण कोड',
        'member-since': 'सदस्य अब से',
        'account-status': 'खाता स्थिति',
        'active': 'सक्रिय',
        'quick-actions': 'त्वरित कार्रवाई',
        'bind-details': 'विवरण जोड़ें',
        'bind-details-desc': 'अपना भुगतान खाता लिंक करें',
        'team-management-desc': 'अपनी टीम प्रबंधित करें',
        'withdrawal-records': 'निकासी रिकॉर्ड',
        'withdrawal-records-desc': 'लेनदेन इतिहास देखें',
        'language-desc': 'ऐप भाषा बदलें',
        'rewards-info': 'इनाम जानकारी',
        'rewards-info-desc': 'कमाई के नियम देखें',
        'privacy-policy': 'गोपनीयता नीति',
        'privacy-policy-desc': 'गोपनीयता शर्तें देखें',
        'logout': 'लॉग आउट',

        // New - Level Page
        'levels-title': 'स्तर',
        'levels-nav': 'स्तर',
        'per-order': 'प्रति ऑर्डर',
        'daily-tasks-label': 'दैनिक कार्य',
        'amount-label': 'राशि',
        'enroll-now': 'अभी नामांकन करें',

        // New - Login/Auth
        'login-title': 'CIC - लॉगिन',
        'welcome-success': 'सफलता में आपका स्वागत है',
        'enter-phone': 'कृपया अपना फोन नंबर दर्ज करें',
        'enter-password': 'कृपया लॉगिन पासवर्ड दर्ज करें',
        'remember-me': 'उपयोगकर्ता नाम/पासवर्ड याद रखें',
        'forgot-password': 'पासवर्ड भूल गए?',
        'login-btn': 'लॉगिन',
        'register': 'रजिस्टर',
        'no-account': 'क्या आपके पास खाता नहीं है?',
        'register-link': 'रजिस्टर',

        // New - Task Page (Extended)
        'task-limit-title': 'दैनिक कार्य सीमा',
        'task-limit-desc': 'कमाने के लिए कार्य पूरे करें',
        'level-reward': 'स्तर इनाम',
        'daily-task-limit': 'दैनिक कार्य सीमा',
        'per-order-commission': 'कमीशन',
        'search-placeholder': 'कार्य खोजें',
        'all-tasks': 'सभी कार्य',
        'pending': 'लंबित',
        'filter-all': 'सभी',
        'filter-pending': 'लंबित',
        'filter-completed': 'पूर्ण',
        'notification-title': 'कार्य अधिसूचना',
        'quiz-title': 'क्विक क्विज़',
        'price': 'मूल्य',
        'remaining': 'शेष'
      };

      console.log('✅ Translations loaded:', Object.keys(this.translations));
    } catch (error) {
      console.error('❌ Error loading translations:', error);
    }
  }

  setLanguage(language) {
    this.currentLanguage = language;
    this.applyLanguage();
  }

  applyLanguage() {
    // Update document language
    document.documentElement.lang = this.currentLanguage;

    // Translate all elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
      const key = element.getAttribute('data-translate');
      const translation = this.translate(key);
      if (translation) {
        element.textContent = translation;
      }
    });

    // Update placeholder texts
    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
      const key = element.getAttribute('data-translate-placeholder');
      const translation = this.translate(key);
      if (translation) {
        element.placeholder = translation;
      }
    });
  }

  translate(key) {
    const lang = this.currentLanguage;
    const translation = this.translations[lang]?.[key] ||
      this.translations.en?.[key] ||
      key;
    return translation;
  }

  getAvailableLanguages() {
    return Object.keys(this.translations);
  }
}

// Initialize global managers
window.CICSettings = new CICSettingsManager();
window.languageManager = new CICLanguageManager();

// Make instances available globally (preferred for UI calls)
window.CICSettingsManager = window.CICSettings;
window.CICLanguageManager = window.languageManager;
