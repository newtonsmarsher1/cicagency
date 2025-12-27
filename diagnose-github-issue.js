// Diagnose why code isn't on GitHub
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Diagnosing GitHub Push Issue\n');
console.log('='.repeat(60));
console.log('');

// Check if git is initialized
const gitExists = fs.existsSync(path.join(__dirname, '.git'));
console.log('1️⃣  Git Repository:');
console.log('   Status:', gitExists ? '✅ Initialized' : '❌ Not initialized');
console.log('');

if (!gitExists) {
    console.log('💡 Solution: Initialize git repository');
    console.log('   Run: git init');
    console.log('');
    process.exit(1);
}

// Check remote
console.log('2️⃣  Remote Repository:');
try {
    const remoteOutput = execSync('git remote -v', { encoding: 'utf8', cwd: __dirname });
    if (remoteOutput.trim()) {
        console.log('   Status: ✅ Configured');
        console.log('   Remotes:');
        remoteOutput.split('\n').forEach(line => {
            if (line.trim()) console.log('     ' + line);
        });
    } else {
        console.log('   Status: ❌ No remote configured');
        console.log('');
        console.log('💡 Solution: Add remote repository');
        console.log('   1. Create repository on GitHub: https://github.com/new');
        console.log('   2. Run: git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git');
    }
} catch (err) {
    console.log('   Status: ❌ Error checking remote');
    console.log('   Error:', err.message);
}
console.log('');

// Check branch
console.log('3️⃣  Current Branch:');
try {
    const branchOutput = execSync('git branch --show-current', { encoding: 'utf8', cwd: __dirname });
    const currentBranch = branchOutput.trim();
    console.log('   Branch:', currentBranch || 'Not on any branch');
    console.log('');
    
    // Check if branch is tracked
    try {
        const trackingOutput = execSync(`git branch -vv`, { encoding: 'utf8', cwd: __dirname });
        const hasTracking = trackingOutput.includes('[');
        console.log('   Tracking:', hasTracking ? '✅ Branch is tracked' : '❌ Branch not tracked');
        if (!hasTracking && currentBranch) {
            console.log('');
            console.log('💡 Solution: Set upstream branch');
            console.log(`   Run: git push -u origin ${currentBranch}`);
        }
    } catch (err) {
        console.log('   Could not check tracking');
    }
} catch (err) {
    console.log('   Error:', err.message);
}
console.log('');

// Check commits
console.log('4️⃣  Local Commits:');
try {
    const logOutput = execSync('git log --oneline -5', { encoding: 'utf8', cwd: __dirname });
    if (logOutput.trim()) {
        console.log('   Status: ✅ Has commits');
        console.log('   Recent commits:');
        logOutput.split('\n').slice(0, 5).forEach(line => {
            if (line.trim()) console.log('     ' + line);
        });
    } else {
        console.log('   Status: ❌ No commits');
        console.log('');
        console.log('💡 Solution: Make a commit first');
        console.log('   Run: git add . && git commit -m "Initial commit"');
    }
} catch (err) {
    console.log('   Error:', err.message);
}
console.log('');

// Check status
console.log('5️⃣  Git Status:');
try {
    const statusOutput = execSync('git status --short', { encoding: 'utf8', cwd: __dirname });
    if (statusOutput.trim()) {
        console.log('   Status: ⚠️  Has uncommitted changes');
        console.log('   Changes:');
        statusOutput.split('\n').slice(0, 10).forEach(line => {
            if (line.trim()) console.log('     ' + line);
        });
        console.log('');
        console.log('💡 Solution: Commit changes first');
        console.log('   Run: git add . && git commit -m "Your message"');
    } else {
        console.log('   Status: ✅ Working directory clean');
    }
} catch (err) {
    console.log('   Error:', err.message);
}
console.log('');

// Check if remote branch exists
console.log('6️⃣  Remote Branch Status:');
try {
    execSync('git fetch origin', { encoding: 'utf8', cwd: __dirname, stdio: 'ignore' });
    const branchOutput = execSync('git branch -r', { encoding: 'utf8', cwd: __dirname });
    if (branchOutput.trim()) {
        console.log('   Status: ✅ Remote branches exist');
        console.log('   Remote branches:');
        branchOutput.split('\n').slice(0, 5).forEach(line => {
            if (line.trim()) console.log('     ' + line);
        });
    } else {
        console.log('   Status: ❌ No remote branches');
        console.log('');
        console.log('💡 Solution: Push for the first time');
        console.log('   Run: git push -u origin main');
    }
} catch (err) {
    console.log('   Status: ⚠️  Could not fetch from remote');
    console.log('   This might mean:');
    console.log('     - Remote is not configured');
    console.log('     - Authentication issue');
    console.log('     - Network issue');
}
console.log('');

console.log('='.repeat(60));
console.log('📋 Summary & Solutions');
console.log('='.repeat(60));
console.log('');

console.log('Most common issues:');
console.log('');
console.log('1. ❌ No remote configured');
console.log('   Solution: git remote add origin https://github.com/USER/REPO.git');
console.log('');
console.log('2. ❌ Branch not pushed yet');
console.log('   Solution: git push -u origin main');
console.log('');
console.log('3. ❌ Authentication required');
console.log('   Solution: Use GitHub CLI (gh auth login) or Personal Access Token');
console.log('');
console.log('4. ❌ Branch name mismatch');
console.log('   Solution: Check if local branch is "main" or "master"');
console.log('            git branch --show-current');
console.log('');







