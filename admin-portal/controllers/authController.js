const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Initialize admin users table
async function initializeAdminUsersTable() {
    try {
        // Create table with PostgreSQL syntax
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'assistant' CHECK (role IN ('ceo', 'admin', 'assistant')),
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
                approved_by INT DEFAULT NULL,
                approved_at TIMESTAMP NULL DEFAULT NULL,
                last_login TIMESTAMP NULL DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes
        await pool.execute(`CREATE INDEX IF NOT EXISTS idx_username ON admin_users(username)`);
        await pool.execute(`CREATE INDEX IF NOT EXISTS idx_email ON admin_users(email)`);
        await pool.execute(`CREATE INDEX IF NOT EXISTS idx_status ON admin_users(status)`);
        await pool.execute(`CREATE INDEX IF NOT EXISTS idx_role ON admin_users(role)`);

        // Add foreign key constraint (if it doesn't exist) using a DO block
        await pool.execute(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_approved_by') THEN
                    ALTER TABLE admin_users 
                    ADD CONSTRAINT fk_approved_by 
                    FOREIGN KEY (approved_by) REFERENCES admin_users(id) ON DELETE SET NULL;
                END IF;
            END $$;
        `);

        // Create trigger for updated_at
        await pool.execute(`DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users`);
        await pool.execute(`
            CREATE TRIGGER update_admin_users_updated_at
                BEFORE UPDATE ON admin_users
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);

        // Create CEO account if it doesn't exist
        const [ceoExists] = await pool.execute(
            `SELECT id FROM admin_users WHERE role = $1 LIMIT 1`,
            ['ceo']
        );

        if (ceoExists.length === 0) {
            const defaultPassword = await bcrypt.hash('CEO@2024', 10);
            await pool.execute(
                `INSERT INTO admin_users (username, email, password, full_name, role, status) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                ['ceo', 'ceo@cicgroup.com', defaultPassword, 'CEO', 'ceo', 'approved']
            );
            console.log('✅ Default CEO account created: username=ceo, password=CEO@2024');
        } else {
            console.log('✅ CEO account already exists');
        }

        return true;
    } catch (error) {
        console.error('❌ Error initializing admin users table:', error.message);
        console.error('Error details:', error);
        // Don't throw - allow server to start even if table creation fails
        return false;
    }
}

// Generate JWT token
function generateToken(adminId, username, role) {
    return jwt.sign(
        { adminId, username, role },
        process.env.JWT_SECRET || 'admin_secret_key_change_in_production',
        { expiresIn: '24h' }
    );
}

// Admin Register
async function register(req, res) {
    try {
        const { username, email, password, full_name } = req.body;

        if (!username || !email || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Check if username or email already exists
        const [existing] = await pool.execute(
            'SELECT id FROM admin_users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user with pending status
        await pool.execute(
            `INSERT INTO admin_users (username, email, password, full_name, role, status) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [username, email, hashedPassword, full_name, 'assistant', 'pending']
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please wait for CEO approval.'
        });
    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

// Admin Login
async function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Check if admin_users table exists, if not create it
        try {
            await pool.execute('SELECT 1 FROM admin_users LIMIT 1');
        } catch (tableError) {
            console.log('⚠️ Admin users table not found, creating it...');
            // Initialize table
            const initialized = await initializeAdminUsersTable();
            if (!initialized) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to initialize admin users table. Please check database configuration and server logs.'
                });
            }
        }

        let admins;
        try {
            [admins] = await pool.execute(
                'SELECT id, username, email, password, full_name, role, status FROM admin_users WHERE username = $1',
                [username]
            );
        } catch (queryError) {
            console.error('❌ Database query error in login:', queryError.message);
            return res.status(500).json({
                success: false,
                message: 'Database query failed. Please check if admin_users table exists.'
            });
        }

        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const admin = admins[0];

        // Check if account is approved
        if (admin.status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: `Account is ${admin.status}. Please wait for CEO approval.`
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Update last login
        await pool.execute(
            'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [admin.id]
        );

        // Generate token
        let token;
        try {
            token = generateToken(admin.id, admin.username, admin.role);
        } catch (tokenError) {
            console.error('❌ Token generation error:', tokenError.message);
            return res.status(500).json({
                success: false,
                message: 'Token generation failed. Please check JWT_SECRET configuration.'
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                full_name: admin.full_name,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('❌ Admin login error:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// Verify Token Middleware
async function verifyToken(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') ||
            req.cookies?.adminToken ||
            req.body?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'admin_secret_key_change_in_production'
        );

        const [admins] = await pool.execute(
            'SELECT id, username, email, full_name, role, status FROM admin_users WHERE id = $1',
            [decoded.adminId]
        );

        if (admins.length === 0 || admins[0].status !== 'approved') {
            return res.status(401).json({
                success: false,
                message: 'Invalid or inactive account'
            });
        }

        req.admin = admins[0];
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
}

// Check if user is CEO
function requireCEO(req, res, next) {
    if (req.admin.role !== 'ceo') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. CEO privileges required.'
        });
    }
    next();
}

// Get Pending Approvals (CEO only)
async function getPendingApprovals(req, res) {
    try {
        const connection = await pool.getConnection();

        const [pending] = await connection.execute(
            `SELECT id, username, email, full_name, role, created_at 
             FROM admin_users 
             WHERE status = 'pending' 
             ORDER BY created_at DESC`
        );

        connection.release();

        res.json({
            success: true,
            data: pending
        });
    } catch (error) {
        console.error('Error getting pending approvals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending approvals'
        });
    }
}

// Approve/Reject Admin (CEO only)
async function approveAdmin(req, res) {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'approve' or 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }

        const connection = await pool.getConnection();

        const status = action === 'approve' ? 'approved' : 'rejected';

        await connection.execute(
            `UPDATE admin_users 
             SET status = ?, approved_by = ?, approved_at = NOW() 
             WHERE id = ?`,
            [status, req.admin.id, id]
        );

        connection.release();

        res.json({
            success: true,
            message: `Admin ${action}d successfully`
        });
    } catch (error) {
        console.error('Error approving admin:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process approval'
        });
    }
}

// Get Admin Profile
async function getProfile(req, res) {
    try {
        const connection = await pool.getConnection();

        const [admins] = await connection.execute(
            `SELECT id, username, email, full_name, role, status, last_login, created_at,
                    (SELECT full_name FROM admin_users WHERE id = admin_users.approved_by) as approved_by_name
             FROM admin_users 
             WHERE id = ?`,
            [req.admin.id]
        );

        connection.release();

        if (admins.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.json({
            success: true,
            data: admins[0]
        });
    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
}

// Update Admin Profile
async function updateProfile(req, res) {
    try {
        const { full_name, email, current_password, new_password } = req.body;
        const connection = await pool.getConnection();

        const updates = [];
        const values = [];

        if (full_name) {
            updates.push('full_name = ?');
            values.push(full_name);
        }

        if (email) {
            // Check if email is already taken
            const [existing] = await connection.execute(
                'SELECT id FROM admin_users WHERE email = ? AND id != ?',
                [email, req.admin.id]
            );

            if (existing.length > 0) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }

            updates.push('email = ?');
            values.push(email);
        }

        if (new_password) {
            if (!current_password) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'Current password is required to change password'
                });
            }

            // Verify current password
            const [admins] = await connection.execute(
                'SELECT password FROM admin_users WHERE id = ?',
                [req.admin.id]
            );

            const isValid = await bcrypt.compare(current_password, admins[0].password);
            if (!isValid) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            if (new_password.length < 6) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 6 characters'
                });
            }

            const hashedPassword = await bcrypt.hash(new_password, 10);
            updates.push('password = ?');
            values.push(hashedPassword);
        }

        if (updates.length === 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(req.admin.id);
        await connection.execute(
            `UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        connection.release();

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
}

// Get All Admins (CEO only)
async function getAllAdmins(req, res) {
    try {
        const connection = await pool.getConnection();

        const [admins] = await connection.execute(
            `SELECT id, username, email, full_name, role, status, last_login, created_at,
                    (SELECT full_name FROM admin_users WHERE id = admin_users.approved_by) as approved_by_name
             FROM admin_users 
             ORDER BY created_at DESC`
        );

        connection.release();

        res.json({
            success: true,
            data: admins
        });
    } catch (error) {
        console.error('Error getting admins:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admins'
        });
    }
}

// Update Admin Status (CEO only)
async function updateAdminStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'suspended', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const connection = await pool.getConnection();
        await connection.execute(
            'UPDATE admin_users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, id]
        );
        connection.release();

        res.json({
            success: true,
            message: `Admin status updated to ${status} successfully`
        });
    } catch (error) {
        console.error('Error updating admin status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update admin status'
        });
    }
}

// Reset Admin Password (CEO only)
async function resetAdminPassword(req, res) {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const connection = await pool.getConnection();
        await connection.execute(
            'UPDATE admin_users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, id]
        );
        connection.release();

        res.json({
            success: true,
            message: 'Admin password reset successfully'
        });
    } catch (error) {
        console.error('Error resetting admin password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset admin password'
        });
    }
}

module.exports = {
    initializeAdminUsersTable,
    register,
    login,
    verifyToken,
    requireCEO,
    getPendingApprovals,
    approveAdmin,
    getProfile,
    updateProfile,
    getAllAdmins,
    updateAdminStatus,
    resetAdminPassword
};

