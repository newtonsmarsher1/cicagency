// Diagnostic script to check invitation code and team status
// Run: node backend/check-team-status.js <user_id_or_phone>

const { pool } = require('./config/database');
require('dotenv').config();

async function checkTeamStatus(identifier) {
    try {
        const connection = await pool.getConnection();
        
        console.log('\n🔍 Checking team status for:', identifier);
        console.log('='.repeat(50));
        
        // Find user by ID or phone
        let query = 'SELECT id, name, phone, invitation_code, invited_by FROM users WHERE ';
        let params = [];
        
        if (/^\d+$/.test(identifier)) {
            // Numeric - assume it's an ID
            query += 'id = ?';
            params = [parseInt(identifier)];
        } else {
            // Assume it's a phone number
            query += 'phone = ?';
            params = [identifier];
        }
        
        const [users] = await connection.execute(query, params);
        
        if (users.length === 0) {
            console.log('❌ User not found!');
            connection.release();
            return;
        }
        
        const user = users[0];
        
        console.log('\n👤 USER INFO:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Phone: ${user.phone}`);
        console.log(`   Invitation Code: ${user.invitation_code || '❌ NOT SET!'}`);
        console.log(`   Invited By: ${user.invited_by || 'None (original user)'}`);
        
        // Check if invitation code exists in database
        if (user.invitation_code) {
            const [codeCheck] = await connection.execute(
                'SELECT COUNT(*) as count FROM users WHERE UPPER(invitation_code) = ?',
                [user.invitation_code.toUpperCase()]
            );
            console.log(`   Code exists in DB: ${codeCheck[0].count > 0 ? '✅ Yes' : '❌ No'}`);
        }
        
        // Get team members
        const [teamMembers] = await connection.execute(
            'SELECT id, name, phone, invitation_code, created_at FROM users WHERE invited_by = ? ORDER BY created_at DESC',
            [user.id]
        );
        
        console.log(`\n👥 TEAM MEMBERS: ${teamMembers.length}`);
        
        if (teamMembers.length === 0) {
            console.log('   No team members found.');
            console.log('\n💡 TROUBLESHOOTING:');
            console.log('   1. Make sure your invitation code is set:', user.invitation_code || 'NOT SET');
            console.log('   2. Check if people registered with your code');
            console.log('   3. Verify the code matches exactly (case-insensitive)');
            
            // Check for users who might have used the code but invited_by is NULL
            if (user.invitation_code) {
                const [potentialMembers] = await connection.execute(
                    'SELECT id, name, phone, invited_by, created_at FROM users WHERE invited_by IS NULL AND created_at > ? ORDER BY created_at DESC LIMIT 10',
                    [user.created_at]
                );
                
                if (potentialMembers.length > 0) {
                    console.log('\n   ⚠️  Found recent users without inviter (might be your referrals):');
                    potentialMembers.forEach(m => {
                        console.log(`      - ${m.name} (${m.phone}) - Created: ${m.created_at}`);
                    });
                }
            }
        } else {
            console.log('\n   Team Members:');
            teamMembers.forEach((member, index) => {
                console.log(`   ${index + 1}. ${member.name} (${member.phone})`);
                console.log(`      Code: ${member.invitation_code || 'N/A'}`);
                console.log(`      Joined: ${member.created_at}`);
            });
        }
        
        // Check invitation_codes table
        console.log('\n📋 INVITATION_CODES TABLE:');
        const [invCodes] = await connection.execute(
            'SELECT id, code, created_by, used_by, is_active FROM invitation_codes WHERE created_by = ? OR code = ? LIMIT 10',
            [user.id, user.invitation_code || '']
        );
        
        if (invCodes.length === 0) {
            console.log('   No entries found (this is OK - user codes are in users table)');
        } else {
            invCodes.forEach(code => {
                console.log(`   - Code: ${code.code}, Created by: ${code.created_by}, Used by: ${code.used_by || 'None'}, Active: ${code.is_active}`);
            });
        }
        
        // Generate referral link
        if (user.invitation_code) {
            console.log('\n🔗 YOUR REFERRAL LINK:');
            console.log(`   signup.html?code=${user.invitation_code}`);
        } else {
            console.log('\n⚠️  WARNING: You don\'t have an invitation code set!');
            console.log('   The system should generate one automatically when you check stats.');
        }
        
        connection.release();
        console.log('\n' + '='.repeat(50) + '\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

// Get identifier from command line
const identifier = process.argv[2];

if (!identifier) {
    console.log('Usage: node backend/check-team-status.js <user_id_or_phone>');
    console.log('Example: node backend/check-team-status.js 1');
    console.log('Example: node backend/check-team-status.js +1234567890');
    process.exit(1);
}

checkTeamStatus(identifier).then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});


