const fs = require('fs');
const path = require('path');

/**
 * This script converts MySQL queries to PostgreSQL in adminController.js
 */

const filePath = path.join(__dirname, '../admin-portal/controllers/adminController.js');

console.log('🔧 Converting adminController.js to PostgreSQL syntax...\n');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Track changes
let changeCount = 0;

// 1. Remove all getConnection() and release() calls
console.log('1. Removing getConnection() and release() calls...');
const beforeConnections = (content.match(/getConnection\(\)/g) || []).length;
content = content.replace(/const connection = await pool\.getConnection\(\);?\n\s*/g, '');
content = content.replace(/connection\.release\(\);?\n?\s*/g, '');
changeCount += beforeConnections;
console.log(`   ✅ Removed ${beforeConnections} connection management calls`);

// 2. Replace connection.execute with pool.execute
console.log('2. Replacing connection.execute with pool.execute...');
const beforeExecute = (content.match(/connection\.execute/g) || []).length;
content = content.replace(/connection\.execute/g, 'pool.execute');
changeCount += beforeExecute;
console.log(`   ✅ Replaced ${beforeExecute} execute calls`);

// 3. Replace MySQL-specific date functions
console.log('3. Converting MySQL date functions to PostgreSQL...');
content = content.replace(/DATE_SUB\(NOW\(\), INTERVAL (\d+) DAY\)/g, "CURRENT_TIMESTAMP - INTERVAL '$1 days'");
content = content.replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP');
content = content.replace(/CURDATE\(\)/g, 'CURRENT_DATE');
changeCount += 3;
console.log('   ✅ Converted date functions');

// 4. Replace double quotes with single quotes in SQL strings
console.log('4. Fixing SQL string quotes...');
const sqlStringPattern = /execute\(\s*['"`]([^'"`]*?)['"`]/g;
let match;
let quoteChanges = 0;
while ((match = sqlStringPattern.exec(content)) !== null) {
    const sqlQuery = match[1];
    if (sqlQuery.includes('"')) {
        const fixed = sqlQuery.replace(/"/g, "'");
        content = content.replace(match[0], match[0].replace(sqlQuery, fixed));
        quoteChanges++;
    }
}
changeCount += quoteChanges;
console.log(`   ✅ Fixed ${quoteChanges} SQL string quotes`);

// 5. Add note about parameter placeholders
console.log('5. Note: Parameter placeholders (?) are handled by database wrapper');
console.log('   ℹ️  The database.js wrapper automatically converts ? to $1, $2, etc.');

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✅ Conversion complete!`);
console.log(`📊 Total changes: ${changeCount}`);
console.log(`📁 File updated: ${filePath}`);
console.log('\n🎯 Next step: Restart admin portal to apply changes');
