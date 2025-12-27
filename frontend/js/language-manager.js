// Language Manager for CIC Application
class LanguageManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {
            en: {
                'signup-title': 'CIC - Register',
                'login-title': 'CIC - Login',
                'register': 'Register',
                'login': 'Login',
                'welcome-msg': 'Welcome to CIC',
                'app-title': 'CIC Agency',
                'app-subtitle': 'Welcome to Success'
            },
            sw: {
                'signup-title': 'CIC - Jisajili',
                'login-title': 'CIC - Ingia',
                'register': 'Jisajili',
                'login': 'Ingia',
                'welcome-msg': 'Karibu CIC',
                'app-title': 'Kampuni ya CIC',
                'app-subtitle': 'Karibu kwa Mafanikio'
            }
        };
    }

    async init() {
        console.log('🌍 Language Manager initialized');
        this.loadLanguage();
        this.updateUI();
    }

    loadLanguage() {
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage && this.translations[savedLanguage]) {
            this.currentLanguage = savedLanguage;
        }
    }

    async changeLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            this.updateUI();
            console.log(`🌍 Language changed to: ${lang}`);
        }
    }

    updateUI() {
        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            if (this.translations[this.currentLanguage][key]) {
                element.textContent = this.translations[this.currentLanguage][key];
            }
        });
    }

    getTranslation(key) {
        return this.translations[this.currentLanguage][key] || key;
    }
}

// Initialize global language manager
window.languageManager = new LanguageManager();

console.log('🌍 Language Manager loaded');




