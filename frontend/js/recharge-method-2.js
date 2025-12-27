document.addEventListener('DOMContentLoaded', function () {
    const rechargeNumberEl = document.getElementById('recharge-number');
    const accountNameEl = document.getElementById('account-name');
    const timerEl = document.getElementById('rotation-timer');
    const manualRechargeForm = document.getElementById('manualRechargeForm');
    const submitBtn = document.getElementById('submitBtn');
    const amountInput = document.getElementById('amount');

    let currentNumber = '';
    let timeLeft = 60;
    let timerInterval;

    // Check URL for amount
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('amount')) {
        amountInput.value = urlParams.get('amount');
    }

    // Fetch initial number
    fetchNumber();

    // Start timer
    startTimer();

    async function fetchNumber() {
        try {
            const baseUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api';
            const response = await fetch(`${baseUrl}/manual-recharge/random-number`);
            const data = await response.json();

            if (data.success) {
                currentNumber = data.data.phone_number;
                rechargeNumberEl.textContent = currentNumber;
                accountNameEl.textContent = data.data.account_name || 'CIC GROUP';

                // Reset timer visuals
                timeLeft = 60;
                updateTimerDisplay();
            } else {
                rechargeNumberEl.textContent = '07XXXXXXXX';
                console.error('Failed to fetch number:', data.message);
            }
        } catch (error) {
            console.error('Error fetching number:', error);
            rechargeNumberEl.textContent = '07XXXXXXXX';
        }
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();

            if (timeLeft <= 0) {
                fetchNumber();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        timerEl.textContent = `${timeLeft}s`;
        if (timeLeft <= 10) {
            timerEl.style.color = '#ff4d4d';
        } else {
            timerEl.style.color = 'white';
        }
    }

    window.copyNumber = function () {
        navigator.clipboard.writeText(currentNumber).then(() => {
            const copyBtn = document.querySelector('.copy-btn');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyBtn.style.background = '#00cc80';

            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '#00ffaa';
            }, 2000);
        });
    };

    manualRechargeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Your session has expired. Please login again.');
            window.location.href = 'index.html';
            return;
        }

        const formData = {
            amount: amountInput.value,
            mpesa_message: document.getElementById('mpesa_message').value
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const baseUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : '/api';
            const response = await fetch(`${baseUrl}/manual-recharge/submit-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
                window.location.href = 'home.html';
            } else {
                alert('Error: ' + data.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit for Approval';
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Failed to submit request. Please check your internet connection and try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit for Approval';
        }
    });

    // Cleanup on page hide
    window.addEventListener('pagehide', () => {
        if (timerInterval) clearInterval(timerInterval);
    });
});
