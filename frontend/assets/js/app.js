// M-Pesa Payment Handler with Backend API
class MpesaPaymentHandler {
    constructor() {
        this.stkModal = document.getElementById('stkModal');
        this.successModal = document.getElementById('successModal');
        this.errorModal = document.getElementById('errorModal');
        this.paymentForm = document.getElementById('paymentForm');
        this.payButton = document.getElementById('payButton');

        this.paymentData = {};
        this.sessionId = null;
        this.pollInterval = null;

        this.initializeEventListeners();
        this.initializeFormValidation();
    }

    initializeEventListeners() {
        // Form submission
        this.paymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission();
        });

        // Phone number formatting with real-time feedback
        const phoneInput = document.getElementById('phoneNumber');
        phoneInput.addEventListener('input', (e) => {
            this.formatPhoneNumber(e);
            this.handlePhoneInputChange(e);
        });

        // Amount input with real-time feedback
        const amountInput = document.getElementById('amount');
        amountInput.addEventListener('input', (e) => {
            this.handleAmountInputChange(e);
        });

        // STK modal events
        document.getElementById('cancelStk').addEventListener('click', () => {
            this.cancelStkPush();
        });

        document.getElementById('closeSuccess').addEventListener('click', () => {
            this.closeSuccessModal();
        });

        document.getElementById('retryPayment').addEventListener('click', () => {
            this.closeErrorModal();
        });

        // Close modals on overlay click
        document.querySelectorAll('.stk-overlay, .success-overlay, .error-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeAllModals();
                }
            });
        });
    }

    initializeFormValidation() {
        // Form validation is now handled by real-time validation in handlePhoneInputChange and handleAmountInputChange
        // No additional blur validation needed to avoid conflicts
    }

    initializePinModal() {
        const pinKeys = document.querySelectorAll('.pin-key');
        pinKeys.forEach(key => {
            key.addEventListener('click', () => {
                const keyValue = key.dataset.key;
                this.handlePinInput(keyValue);
            });
        });

        // Keyboard support for PIN
        document.addEventListener('keydown', (e) => {
            if (this.pinModal.style.display === 'block') {
                if (e.key >= '0' && e.key <= '9') {
                    this.handlePinInput(e.key);
                } else if (e.key === 'Backspace') {
                    this.handlePinInput('clear');
                } else if (e.key === 'Enter') {
                    this.handlePinInput('submit');
                }
            }
        });
    }

    formatPhoneNumber(e) {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length > 9) {
            value = value.substring(0, 9);
        }
        e.target.value = value;
    }

    handlePhoneInputChange(e) {
        const value = e.target.value;
        const input = e.target;

        // Remove existing classes and messages
        input.classList.remove('error', 'success');

        // Remove any existing error messages
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        if (value.length === 0) {
            // Empty state
            return;
        } else if (value.length === 9 && (value.startsWith('0') || value.startsWith('7') || value.startsWith('1'))) {
            // Valid phone number
            input.classList.add('success');
            this.showInputFeedback(input, 'Valid M-Pesa number', 'success');
        } else if (value.length > 0) {
            // Invalid phone number
            input.classList.add('error');
            this.showInputFeedback(input, 'Enter 9 digits starting with 0, 1, or 7', 'error');
        }
    }

    handleAmountInputChange(e) {
        const value = parseFloat(e.target.value);
        const input = e.target;

        // Remove existing classes
        input.classList.remove('error', 'success');

        if (isNaN(value) || value < 1) {
            // Invalid amount
            input.classList.add('error');
            this.showInputFeedback(input, 'Minimum amount is KES 1', 'error');
        } else if (value >= 1) {
            // Valid amount
            input.classList.add('success');
            this.showInputFeedback(input, `Amount: KES ${value.toLocaleString()}`, 'success');
        }
    }

    showInputFeedback(input, message, type) {
        // Remove existing feedback
        const existingFeedback = input.parentNode.querySelector('.input-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        // Create new feedback
        const feedback = document.createElement('div');
        feedback.className = `input-feedback ${type}`;
        feedback.textContent = message;

        // Style the feedback
        feedback.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 5px;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 500;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            z-index: 10;
        `;

        if (type === 'success') {
            feedback.style.background = 'linear-gradient(135deg, #d4edda, #c3e6cb)';
            feedback.style.color = '#155724';
            feedback.style.border = '1px solid #c3e6cb';
        } else {
            feedback.style.background = 'linear-gradient(135deg, #f8d7da, #f5c6cb)';
            feedback.style.color = '#721c24';
            feedback.style.border = '1px solid #f5c6cb';
        }

        // Add to DOM
        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(feedback);

        // Animate in
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateY(0)';
        }, 10);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.style.opacity = '0';
                feedback.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    if (feedback.parentNode) {
                        feedback.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    validatePhoneNumber(phoneNumber) {
        // M-Pesa phone numbers should be 9 digits starting with 0, 1, or 7
        const cleaned = phoneNumber.replace(/[^0-9]/g, '');
        return cleaned.length === 9 && (cleaned.startsWith('0') || cleaned.startsWith('7') || cleaned.startsWith('1'));
    }

    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    clearFieldError(field) {
        field.classList.remove('error', 'success');
        const errorMessage = field.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
        // Also remove any input feedback
        const inputFeedback = field.parentNode.querySelector('.input-feedback');
        if (inputFeedback) {
            inputFeedback.remove();
        }
    }

    validateForm() {
        const amountInput = document.getElementById('amount');
        const phoneInput = document.getElementById('phoneNumber');

        let isFormValid = true;

        // Clear previous validation states
        amountInput.classList.remove('error', 'success');
        phoneInput.classList.remove('error', 'success');

        // Remove existing feedback messages
        const existingAmountFeedback = amountInput.parentNode.querySelector('.input-feedback');
        if (existingAmountFeedback) existingAmountFeedback.remove();

        const existingPhoneFeedback = phoneInput.parentNode.querySelector('.input-feedback');
        if (existingPhoneFeedback) existingPhoneFeedback.remove();

        // Validate amount
        const amount = parseFloat(amountInput.value);
        if (!amountInput.value || isNaN(amount) || amount < 1) {
            amountInput.classList.add('error');
            this.showInputFeedback(amountInput, 'Please enter a valid amount (minimum KES 1)', 'error');
            isFormValid = false;
        } else {
            amountInput.classList.add('success');
        }

        // Validate phone number - clean the input first
        const phoneValue = phoneInput.value.replace(/[^0-9]/g, '');
        if (!phoneInput.value || phoneValue.length !== 9 || (!phoneValue.startsWith('0') && !phoneValue.startsWith('7') && !phoneValue.startsWith('1'))) {
            phoneInput.classList.add('error');
            this.showInputFeedback(phoneInput, 'Please enter a valid phone number (9 digits starting with 0, 1, or 7)', 'error');
            isFormValid = false;
        } else {
            phoneInput.classList.add('success');
        }

        return isFormValid;
    }

    handleFormSubmission() {
        // Get form values
        const amount = document.getElementById('amount').value;
        const phoneNumber = document.getElementById('phoneNumber').value;

        // Debug logging
        console.log('Raw amount:', amount);
        console.log('Raw phone:', phoneNumber);
        console.log('Phone length:', phoneNumber.length);
        console.log('Phone starts with 0:', phoneNumber.startsWith('0'));
        console.log('Phone starts with 7:', phoneNumber.startsWith('7'));

        // Basic validation
        if (!amount || !phoneNumber) {
            this.showError('Please fill in all required fields.');
            return;
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum < 1) {
            this.showError('Please enter a valid amount (minimum KES 1).');
            return;
        }

        // Smart phone number formatting - handle all Kenyan formats
        let formattedPhone = this.formatPhoneNumber(phoneNumber);
        console.log('Original phone:', phoneNumber);
        console.log('Formatted phone:', formattedPhone);

        if (!formattedPhone) {
            this.showError('Please enter a valid Kenyan phone number (supports +254, 07, 01 formats).');
            return;
        }

        // Collect payment data
        this.paymentData = {
            amount: amount,
            phoneNumber: formattedPhone
        };

        console.log('Payment data:', this.paymentData);

        // Update STK modal with transaction details
        document.getElementById('stkAmount').textContent = `KES ${parseFloat(this.paymentData.amount).toFixed(2)}`;
        document.getElementById('stkPhone').textContent = `+254 ${this.paymentData.phoneNumber}`;

        // Process payment with STK Push
        this.processPayment();
    }

    showStkModal() {
        this.stkModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeStkModal() {
        this.stkModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    async processPayment() {
        this.payButton.classList.add('loading');
        this.payButton.disabled = true;

        try {
            // Send payment request to backend using API_CONFIG
            // API_CONFIG.BASE_URL already includes '/api'
            const baseUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api';
            const url = `${baseUrl}/mpesa/stk-push`;

            console.log('Initiating payment to:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: this.paymentData.amount,
                    phoneNumber: this.paymentData.phoneNumber
                })
            });

            const data = await response.json();

            if (data.success) {
                this.sessionId = data.sessionId;

                // Show STK modal with waiting status
                this.showStkModal();
                document.getElementById('stkStatus').textContent = 'Waiting for PIN...';
                document.getElementById('stkStatus').className = 'status-pending';

                // Start polling for payment status
                this.pollPaymentStatus();

            } else {
                throw new Error(data.message || 'STK Push failed');
            }

        } catch (error) {
            console.error('STK Push Error:', error);
            this.showError('Failed to send STK Push. Please try again.');
        } finally {
            this.payButton.classList.remove('loading');
            this.payButton.disabled = false;
        }
    }

    async pollPaymentStatus() {
        const maxAttempts = 30; // Poll for 5 minutes (30 * 10 seconds)
        let attempts = 0;

        this.pollInterval = setInterval(async () => {
            attempts++;

            try {
                // Use API_CONFIG for status check as well
                const baseUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api';
                const url = `${baseUrl}/mpesa/payment-status/${this.sessionId}`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.success) {
                    if (data.status === 'success') {
                        // Payment successful
                        clearInterval(this.pollInterval);
                        this.handlePaymentSuccess(data.data);
                    } else if (data.status === 'cancelled') {
                        // User cancelled
                        clearInterval(this.pollInterval);
                        this.handlePaymentCancelled();
                    } else if (data.status === 'failed') {
                        // Payment failed
                        clearInterval(this.pollInterval);
                        this.handlePaymentFailed(data.data.errorMessage);
                    } else if (attempts >= maxAttempts) {
                        // Timeout
                        clearInterval(this.pollInterval);
                        this.handlePaymentTimeout();
                    }
                } else {
                    throw new Error(data.message || 'Status check failed');
                }

            } catch (error) {
                console.error('Status check error:', error);
                if (attempts >= maxAttempts) {
                    clearInterval(this.pollInterval);
                    this.handlePaymentTimeout();
                }
            }
        }, 10000); // Poll every 10 seconds
    }

    async checkPaymentStatus() {
        const accessToken = await this.getAccessToken();

        const payload = {
            BusinessShortCode: this.apiConfig.businessShortCode,
            Password: this.generatePassword(),
            Timestamp: this.generateTimestamp(),
            CheckoutRequestID: this.checkoutRequestId
        };

        const response = await fetch(`${this.apiConfig.baseUrl}/mpesa/stkpushquery/v1/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        return await response.json();
    }

    handlePaymentSuccess(paymentData) {
        document.getElementById('stkStatus').textContent = 'Payment Successful!';
        document.getElementById('stkStatus').className = 'status-success';

        // Generate transaction details
        const transactionId = paymentData.transactionId || 'MPESA-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const currentDate = new Date().toLocaleString();

        // Update success modal
        document.getElementById('transactionId').textContent = transactionId;
        document.getElementById('paidAmount').textContent = `KES ${parseFloat(paymentData.amount).toFixed(2)}`;
        document.getElementById('paidPhone').textContent = `+254 ${paymentData.phoneNumber}`;
        document.getElementById('transactionDate').textContent = currentDate;

        // Close STK modal and show success
        setTimeout(() => {
            this.closeStkModal();
            this.showSuccessModal();
        }, 2000);
    }

    handlePaymentCancelled() {
        document.getElementById('stkStatus').textContent = 'Payment Cancelled';
        document.getElementById('stkStatus').className = 'status-failed';

        setTimeout(() => {
            this.closeStkModal();
            this.showError('Payment was cancelled by user.');
        }, 2000);
    }

    handlePaymentFailed(errorMessage) {
        document.getElementById('stkStatus').textContent = 'Payment Failed';
        document.getElementById('stkStatus').className = 'status-failed';

        setTimeout(() => {
            this.closeStkModal();
            this.showError(errorMessage || 'Payment failed. Please try again.');
        }, 2000);
    }

    handlePaymentTimeout() {
        document.getElementById('stkStatus').textContent = 'Payment Timeout';
        document.getElementById('stkStatus').className = 'status-failed';

        setTimeout(() => {
            this.closeStkModal();
            this.showError('Payment timeout. Please try again.');
        }, 2000);
    }

    cancelStkPush() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        this.closeStkModal();
        this.showError('Payment cancelled.');
    }

    // Real M-Pesa API integration methods (for production use)
    async getAccessToken() {
        const auth = btoa(`${this.apiConfig.consumerKey}:${this.apiConfig.consumerSecret}`);

        const response = await fetch(`${this.apiConfig.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        return data.access_token;
    }

    async initiateSTKPush(accessToken) {
        const timestamp = this.generateTimestamp();
        const password = this.generatePassword();

        // Phone number is already formatted correctly (9 digits without country code)
        // Just add the 254 prefix for M-Pesa API
        const formattedPhone = `254${this.paymentData.phoneNumber}`;

        const payload = {
            BusinessShortCode: this.apiConfig.businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: parseInt(this.paymentData.amount),
            PartyA: formattedPhone,
            PartyB: this.apiConfig.businessShortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: this.apiConfig.callbackUrl,
            AccountReference: "Payment",
            TransactionDesc: "M-Pesa Payment"
        };

        const response = await fetch(`${this.apiConfig.baseUrl}/mpesa/stkpush/v1/processrequest`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        return await response.json();
    }

    generateTimestamp() {
        return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    }

    generatePassword() {
        const timestamp = this.generateTimestamp();
        return btoa(`${this.apiConfig.businessShortCode}${this.apiConfig.passkey}${timestamp}`);
    }

    showSuccessModal() {
        this.successModal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Reset form after successful payment
        setTimeout(() => {
            this.resetForm();
        }, 1000);
    }

    closeSuccessModal() {
        this.successModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        this.errorModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeErrorModal() {
        this.errorModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    closeAllModals() {
        this.closeStkModal();
        this.closeSuccessModal();
        this.closeErrorModal();
    }

    formatPhoneNumber(phoneInput) {
        // Ensure phoneInput is a string and not empty
        let phoneStr = String(phoneInput || '').trim();

        if (!phoneStr || phoneStr === 'undefined' || phoneStr === 'null') {
            return null;
        }

        // Remove all non-numeric characters except +
        let cleaned = phoneStr.replace(/[^0-9+]/g, '');

        // Only log if there's actual content to avoid spam
        if (cleaned) {
            console.log('Cleaned input:', cleaned);
        }

        // Check if cleaned input is empty
        if (!cleaned) {
            return null;
        }

        // Handle different input formats
        if (cleaned.startsWith('+254')) {
            // Format: +254712345678 or +254147100360
            let number = cleaned.substring(4); // Remove +254
            console.log('+254 format detected, number:', number);

            if (number.length === 9) {
                // Valid: +254712345678 -> 712345678
                return number;
            } else {
                console.log('Invalid +254 format length:', number.length);
                return null;
            }

        } else if (cleaned.startsWith('254')) {
            // Format: 254712345678 or 254147100360
            let number = cleaned.substring(3); // Remove 254
            console.log('254 format detected, number:', number);

            if (number.length === 9) {
                // Valid: 254712345678 -> 712345678
                return number;
            } else {
                console.log('Invalid 254 format length:', number.length);
                return null;
            }

        } else if (cleaned.startsWith('0')) {
            // Format: 0712345678 or 0114710036
            let number = cleaned.substring(1); // Remove leading 0
            console.log('0 format detected, number:', number);

            if (number.length === 9) {
                // Valid: 0712345678 -> 712345678
                return number;
            } else {
                console.log('Invalid 0 format length:', number.length);
                return null;
            }

        } else if (cleaned.length === 9) {
            // Format: 712345678 or 147100360 (already correct)
            console.log('9-digit format detected:', cleaned);

            // Check if it starts with valid Kenyan prefixes
            if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
                return cleaned;
            } else {
                console.log('Invalid 9-digit prefix:', cleaned[0]);
                return null;
            }

        } else {
            console.log('Unrecognized format:', cleaned);
            return null;
        }
    }

    resetForm() {
        this.paymentForm.reset();
        const inputs = this.paymentForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.classList.remove('error', 'success');
        });

        const errorMessages = this.paymentForm.querySelectorAll('.error-message');
        errorMessages.forEach(error => error.remove());

        const inputFeedbacks = this.paymentForm.querySelectorAll('.input-feedback');
        inputFeedbacks.forEach(feedback => feedback.remove());
    }
}

// Initialize the M-Pesa payment handler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MpesaPaymentHandler();
});

// Additional utility functions
function addInputMask(input, mask) {
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = '';

        for (let i = 0; i < mask.length && i < value.length; i++) {
            if (mask[i] === 'X') {
                formattedValue += value[i];
            } else {
                formattedValue += mask[i];
            }
        }

        e.target.value = formattedValue;
    });
}

// Security features
function sanitizeInput(input) {
    return input.replace(/[<>\"'&]/g, '');
}

function generateSecureToken() {
    return Math.random().toString(36).substr(2) + Date.now().toString(36);
}

// Accessibility improvements
function addKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            // Ensure proper tab order
            const focusableElements = document.querySelectorAll(
                'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
}

// Initialize accessibility features
document.addEventListener('DOMContentLoaded', () => {
    addKeyboardNavigation();
});
