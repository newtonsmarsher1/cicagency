# PowerShell script to push code to GitHub
Write-Host ""
Write-Host "🚀 Preparing to push to GitHub..." -ForegroundColor Cyan
Write-Host ""

$repoPath = $PSScriptRoot
Set-Location $repoPath

# Check if git is initialized
if (-not (Test-Path .git)) {
    Write-Host "📦 Initializing git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Check git status
Write-Host "📋 Checking git status..." -ForegroundColor Cyan
$status = git status --porcelain

if ($status) {
    Write-Host "✅ Found changes to commit" -ForegroundColor Green
    Write-Host ""
    
    # Stage all changes
    Write-Host "📝 Staging all changes..." -ForegroundColor Cyan
    git add .
    
    # Check if there's a commit message
    $commitMessage = "Prepare for Vercel deployment - Add serverless function and update configuration"
    
    Write-Host "💾 Committing changes..." -ForegroundColor Cyan
    Write-Host "   Message: $commitMessage" -ForegroundColor Gray
    git commit -m $commitMessage
    
    Write-Host ""
    Write-Host "✅ Changes committed!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ℹ️  No changes to commit" -ForegroundColor Yellow
    Write-Host ""
}

# Check for remote
$remote = git remote -v
if (-not $remote) {
    Write-Host "⚠️  No remote repository configured" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To add a remote repository:" -ForegroundColor Cyan
    Write-Host "  1. Create a repository on GitHub" -ForegroundColor Gray
    Write-Host "  2. Run: git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git" -ForegroundColor Gray
    Write-Host "  3. Then run this script again" -ForegroundColor Gray
    Write-Host ""
    
    $addRemote = Read-Host "Do you want to add a remote repository now? (y/n)"
    if ($addRemote -eq 'y' -or $addRemote -eq 'Y') {
        $repoUrl = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git)"
        if ($repoUrl) {
            git remote add origin $repoUrl
            Write-Host "✅ Remote added: $repoUrl" -ForegroundColor Green
        }
    } else {
        Write-Host ""
        Write-Host "📝 Manual steps:" -ForegroundColor Cyan
        Write-Host "  1. Create repo on GitHub: https://github.com/new" -ForegroundColor Gray
        Write-Host "  2. Run: git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git" -ForegroundColor Gray
        Write-Host "  3. Run: git push -u origin main" -ForegroundColor Gray
        Write-Host ""
        exit 0
    }
}

# Check current branch
$currentBranch = git branch --show-current
if (-not $currentBranch) {
    git branch -M main
    $currentBranch = "main"
}

Write-Host "🌿 Current branch: $currentBranch" -ForegroundColor Cyan
Write-Host ""

# Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
Write-Host ""

try {
    # Try to push
    $pushOutput = git push -u origin $currentBranch 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Your code is now on GitHub!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Go to https://vercel.com/dashboard" -ForegroundColor Gray
        Write-Host "  2. Click 'Add New Project'" -ForegroundColor Gray
        Write-Host "  3. Import your GitHub repository" -ForegroundColor Gray
        Write-Host "  4. Deploy!" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "❌ Push failed. Output:" -ForegroundColor Red
        Write-Host $pushOutput -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Common issues:" -ForegroundColor Yellow
        Write-Host "  - Authentication required (use GitHub CLI or SSH)" -ForegroundColor Gray
        Write-Host "  - Remote repository doesn't exist" -ForegroundColor Gray
        Write-Host "  - Branch protection rules" -ForegroundColor Gray
        Write-Host ""
    }
} catch {
    Write-Host "❌ Error pushing to GitHub: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Try pushing manually:" -ForegroundColor Yellow
    Write-Host "  git push -u origin $currentBranch" -ForegroundColor Gray
    Write-Host ""
}







