/**
 * Date restriction utility
 * Blocks tasks and withdrawals on:
 * - Sundays
 * - Public holidays (Kenya)
 * - Every 4th Friday of the month (Auditing Day)
 */

// Kenya public holidays for 2025 (add more years as needed)
// Note: Islamic holidays (Eid al-Fitr, Eid al-Adha) vary each year based on lunar calendar
const PUBLIC_HOLIDAYS = {
    2024: {
        '2024-12-25': 'Christmas Day',
        '2024-12-26': 'Boxing Day'
    },
    2025: {
        '2025-01-01': "New Year's Day",
        '2025-03-29': 'Good Friday',
        '2025-03-31': 'Easter Monday',
        '2025-04-10': 'Eid al-Fitr',
        '2025-05-01': 'Labour Day',
        '2025-06-01': 'Madaraka Day',
        '2025-06-16': 'Eid al-Adha',
        '2025-10-10': 'Mashujaa Day',
        '2025-10-20': 'Mashujaa Day (Observed)',
        '2025-12-12': 'Jamhuri Day',
        '2025-12-25': 'Christmas Day',
        '2025-12-26': 'Boxing Day',
    },
    2026: {
        '2026-01-01': "New Year's Day",
        '2026-03-20': 'Good Friday',
        '2026-03-23': 'Easter Monday',
        '2026-03-30': 'Eid al-Fitr',
        '2026-05-01': 'Labour Day',
        '2026-06-01': 'Madaraka Day',
        '2026-06-06': 'Eid al-Adha',
        '2026-10-10': 'Mashujaa Day',
        '2026-10-20': 'Mashujaa Day (Observed)',
        '2026-12-12': 'Jamhuri Day',
        '2026-12-25': 'Christmas Day',
        '2026-12-26': 'Boxing Day',
    },
};

/**
 * Check if a given date is a Sunday
 * @param {Date} date - Date to check
 * @returns {boolean}
 */
function isSunday(date) {
    return date.getDay() === 0; // 0 = Sunday
}

/**
 * Check if a given date is a public holiday
 * @param {Date} date - Date to check
 * @returns {string|null} Holiday name or null
 */
function isPublicHoliday(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    if (PUBLIC_HOLIDAYS[year] && PUBLIC_HOLIDAYS[year][dateStr]) {
        return PUBLIC_HOLIDAYS[year][dateStr];
    }

    return null;
}

/**
 * Check if a given date is the 4th Friday of the month (Auditing Day)
 * @param {Date} date - Date to check
 * @returns {boolean}
 */
function isAuditingDay(date) {
    // Check if it's a Friday
    if (date.getDay() !== 5) { // 5 = Friday
        return false;
    }

    // Get the day of the month
    const dayOfMonth = date.getDate();

    // Check if it's between the 22nd and 28th (4th Friday falls in this range)
    // The 4th Friday is always between day 22-28
    if (dayOfMonth >= 22 && dayOfMonth <= 28) {
        // Count Fridays in the month up to this date
        let fridayCount = 0;
        const checkDate = new Date(date.getFullYear(), date.getMonth(), 1);

        while (checkDate <= date) {
            if (checkDate.getDay() === 5) { // Friday
                fridayCount++;
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }

        // If this is the 4th Friday, return true
        return fridayCount === 4;
    }

    return false;
}

/**
 * Check if a given date is restricted (no tasks or withdrawals allowed)
 * @param {Date} date - Date to check (defaults to today)
 * @returns {Object} { isRestricted: boolean, reason: string }
 */
function isRestrictedDate(date = new Date()) {
    // Treat the date input as local time
    const checkDate = new Date(date);
    // No need to set hours to 0 if we use local methods consistently, 
    // but keeping for robustness in case date.getDay() or others are used later.
    checkDate.setHours(0, 0, 0, 0);

    if (isSunday(checkDate)) {
        return {
            isRestricted: true,
            reason: 'Tasks and withdrawals are not available on Sundays',
            holidayName: 'Sunday'
        };
    }

    const holidayName = isPublicHoliday(checkDate);
    if (holidayName) {
        return {
            isRestricted: true,
            reason: `Tasks and withdrawals are not available on ${holidayName}`,
            holidayName: holidayName
        };
    }

    if (isAuditingDay(checkDate)) {
        return {
            isRestricted: true,
            reason: 'Tasks and withdrawals are not available on auditing day (4th Friday of the month)',
            holidayName: 'Auditing Day'
        };
    }

    return {
        isRestricted: false,
        reason: null
    };
}

/**
 * Get the next available date for tasks/withdrawals
 * @param {Date} startDate - Starting date (defaults to today)
 * @returns {Date} Next available date
 */
function getNextAvailableDate(startDate = new Date()) {
    let nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Keep checking until we find a non-restricted date
    let attempts = 0;
    while (attempts < 30) { // Max 30 days ahead
        const restriction = isRestrictedDate(nextDate);
        if (!restriction.isRestricted) {
            return nextDate;
        }
        nextDate.setDate(nextDate.getDate() + 1);
        attempts++;
    }

    // Fallback: return date 7 days from start
    return new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
}

module.exports = {
    isSunday,
    isPublicHoliday,
    isAuditingDay,
    isRestrictedDate,
    getNextAvailableDate,
    PUBLIC_HOLIDAYS
};

