-- =====================================================
-- CIC GROUP - Complete Database Setup Script
-- =====================================================
-- This script creates all necessary tables for the CIC application
-- including invitation/referral system, payments, tasks, and withdrawals
-- Run this script in MySQL to set up the complete database
-- =====================================================

-- Create database
CREATE DATABASE IF NOT EXISTS cic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE cic;

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
-- Stores all user accounts with invitation/referral tracking
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    invitation_code VARCHAR(50) DEFAULT NULL,
    wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    level INT DEFAULT 0,
    is_temporary_worker BOOLEAN DEFAULT FALSE,
    temp_worker_start_date DATE DEFAULT NULL,
    invited_by INT DEFAULT NULL,
    last_login TIMESTAMP NULL DEFAULT NULL,
    tasks_completed_today INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_invitation_code (invitation_code),
    INDEX idx_invited_by (invited_by),
    INDEX idx_email (email),
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. INVITATION_CODES TABLE
-- =====================================================
-- Tracks invitation codes (for single-use codes from admin)
-- Note: User invitation codes are stored in users.invitation_code
CREATE TABLE IF NOT EXISTS invitation_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_by INT DEFAULT NULL,
    used_by INT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_created_by (created_by),
    INDEX idx_used_by (used_by),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. PAYMENTS TABLE
-- =====================================================
-- Stores all payment transactions (recharges, withdrawals, bonuses)
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    phone_number VARCHAR(20) DEFAULT NULL,
    transaction_id VARCHAR(100) DEFAULT NULL,
    session_id VARCHAR(100) DEFAULT NULL,
    payment_method VARCHAR(50) DEFAULT NULL,
    payment_type ENUM('recharge', 'investment', 'withdrawal', 'bonus', 'referral') DEFAULT 'recharge',
    status ENUM('pending', 'success', 'failed', 'cancelled') DEFAULT 'pending',
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_session_id (session_id),
    INDEX idx_status (status),
    INDEX idx_payment_type (payment_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. USER_TASKS TABLE
-- =====================================================
-- Tracks user task completions with full details
CREATE TABLE IF NOT EXISTS user_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT NOT NULL,
    task_name VARCHAR(255) DEFAULT NULL,
    task_type VARCHAR(100) DEFAULT 'regular',
    question TEXT DEFAULT NULL,
    user_answer TEXT DEFAULT NULL,
    correct_answer TEXT DEFAULT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    is_complete TINYINT(1) DEFAULT 0,
    reward_amount DECIMAL(10,2) DEFAULT 0.00,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_task_id (task_id),
    INDEX idx_is_complete (is_complete),
    INDEX idx_is_correct (is_correct),
    INDEX idx_completed_at (completed_at),
    INDEX idx_user_task_date (user_id, completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. WITHDRAWAL_REQUESTS TABLE
-- =====================================================
-- Stores withdrawal requests from users
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    bank_name VARCHAR(255) DEFAULT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) DEFAULT NULL,
    payment_method VARCHAR(50) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP NULL DEFAULT NULL,
    admin_notes TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_request_date (request_date),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. PAYMENT_DETAILS TABLE
-- =====================================================
-- Stores user's saved payment method information
CREATE TABLE IF NOT EXISTS payment_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    payment_method ENUM('mpesa', 'bank', 'airtel') NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_payment_method (payment_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. NOTIFICATIONS TABLE (Optional - if you have notifications)
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify tables were created successfully

-- Show all tables
SHOW TABLES;

-- Show table structures
DESCRIBE users;
DESCRIBE invitation_codes;
DESCRIBE payments;
DESCRIBE user_tasks;
DESCRIBE withdrawal_requests;
DESCRIBE payment_details;
DESCRIBE notifications;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Users can share their invitation_code from users.invitation_code
-- 2. When someone registers with a code, invited_by is set to the code owner's ID
-- 3. Team members are found by: SELECT * FROM users WHERE invited_by = YOUR_USER_ID
-- 4. invitation_codes table is for admin-created single-use codes
-- 5. user_tasks has both is_correct and is_complete for compatibility
-- 6. All foreign keys use CASCADE or SET NULL appropriately
-- =====================================================


