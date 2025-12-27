-- CIC Database Update Script
-- Run this script to add missing columns for real user data

USE cic;

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_temporary_worker BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS temp_worker_start_date TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invited_by INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL DEFAULT NULL;

-- Add foreign key for invited_by
ALTER TABLE users 
ADD CONSTRAINT fk_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create payments table for transaction history
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_type ENUM('recharge', 'withdrawal', 'bonus', 'referral') DEFAULT 'recharge',
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    mpesa_receipt_number VARCHAR(255) DEFAULT NULL,
    phone_number VARCHAR(20) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_tasks table for task tracking
CREATE TABLE IF NOT EXISTS user_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    task_description TEXT DEFAULT NULL,
    amount DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    completed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_completed_at (completed_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    admin_notes TEXT DEFAULT NULL,
    processed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert some sample data for testing
INSERT INTO payments (user_id, amount, payment_type, status, description) VALUES 
(1, 100.00, 'recharge', 'completed', 'Initial recharge'),
(1, 50.00, 'bonus', 'completed', 'Welcome bonus'),
(1, 25.00, 'referral', 'completed', 'Referral bonus')
ON DUPLICATE KEY UPDATE amount = amount;

-- Update users table with sample data
UPDATE users SET 
    wallet_balance = 175.00,
    total_earnings = 175.00,
    level = 1,
    email = 'user@example.com'
WHERE id = 1;

-- Show updated table structure
DESCRIBE users;
DESCRIBE payments;
DESCRIBE user_tasks;
DESCRIBE withdrawal_requests;







