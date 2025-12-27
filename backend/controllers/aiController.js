const { pool } = require('../config/database');

// AI Chatbot Controller
const aiController = {
  // Get AI response based on user query and context
  getAIResponse: async (req, res) => {
    try {
      const { message, userId } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }

      // Get user data for context
      let userData = null;
      if (userId) {
        try {
          const [userRows] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
          );

          if (userRows.length > 0) {
            userData = userRows[0];

            // Get additional user stats
            const [statsRows] = await pool.execute(
              'SELECT * FROM payments WHERE user_id = ?',
              [userId]
            );

            userData.recentPayments = statsRows.slice(0, 5);
          }
        } catch (error) {
          console.log('Could not fetch user data for AI:', error);
        }
      }

      // Generate AI response based on message content
      const response = generateAIResponse(message.toLowerCase(), userData);

      res.json({
        success: true,
        data: {
          response,
          timestamp: new Date().toISOString(),
          userData: userData ? {
            wallet_balance: userData.wallet_balance,
            total_earnings: userData.total_earnings,
            level: userData.level,
            team_size: userData.team_size
          } : null
        }
      });

    } catch (error) {
      console.error('AI Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Get user context for AI
  getUserContext: async (req, res) => {
    try {
      const userId = req.user.id;

      const [userRows] = await pool.execute(
        'SELECT wallet_balance, total_earnings, level, team_size, created_at FROM users WHERE id = ?',
        [userId]
      );

      if (userRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userData = userRows[0];

      // Get recent activity
      const [paymentsRows] = await pool.execute(
        'SELECT amount, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
        [userId]
      );

      const [tasksRows] = await pool.execute(
        'SELECT COUNT(*) as completed_today FROM user_tasks WHERE user_id = ? AND DATE(completed_at) = CURRENT_DATE',
        [userId]
      );

      res.json({
        success: true,
        data: {
          user: userData,
          recentPayments: paymentsRows,
          tasksCompletedToday: tasksRows[0]?.completed_today || 0
        }
      });

    } catch (error) {
      console.error('Get User Context Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
};

// AI Response Generation Logic
function generateAIResponse(message, userData) {
  // Account and Balance queries
  if (message.includes('balance') || message.includes('wallet') || message.includes('money')) {
    if (userData) {
      const totalBalance = (parseFloat(userData.wallet_balance) || 0) + (parseFloat(userData.personal_wallet) || 0);
      return `💰 <strong>Your Account Balance:</strong><br>
              • Income Wallet (Total): KES ${totalBalance}<br>
              • Available Earnings: KES ${userData.wallet_balance || 0}<br>
              • Recharges: KES ${userData.personal_wallet || 0}<br>
              • Total Earnings History: KES ${userData.total_earnings || 0}<br>
              • Current Level: ${userData.level || 'Beginner'}<br><br>
              Your account is looking great! Keep up the good work! 💪`;
    } else {
      return `💰 To view your balance, please log in to your account first. You can check your wallet amounts on the home page.`;
    }
  }

  // Payment queries
  if (message.includes('payment') || message.includes('recharge') || message.includes('pay')) {
    return `💳 <strong>Payment Information:</strong><br>
            • Use M-Pesa to recharge your account<br>
            • Go to the "Recharge" section<br>
            • Enter amount and phone number<br>
            • Follow M-Pesa prompts<br>
            • Minimum recharge: KES 50<br>
            • Maximum recharge: KES 70,000<br><br>
            Need help with a specific payment? Let me know!`;
  }

  // Investment queries
  if (message.includes('invest') || message.includes('investment') || message.includes('fund')) {
    return `📈 <strong>Investment Opportunities:</strong><br>
            • Check the "Invest" section for available funds<br>
            • Start with small amounts to learn<br>
            • Monitor your investments regularly<br>
            • Diversify your portfolio<br>
            • Expected returns: 5-15% monthly<br><br>
            Remember: All investments carry risk. Start small and learn!`;
  }

  // Earnings queries
  if (message.includes('earn') || message.includes('earning') || message.includes('income')) {
    if (userData) {
      return `📊 <strong>Your Earnings Summary:</strong><br>
              • Total Earnings: KES ${userData.total_earnings || 0}<br>
              • Wallet Balance: KES ${userData.wallet_balance || 0}<br>
              • Team Size: ${userData.team_size || 0} members<br>
              • Current Level: ${userData.level || 'Beginner'}<br><br>
              Keep up the great work! Your consistency is paying off! 💪`;
    } else {
      return `📊 Your earnings are tracked daily. Log in to see your detailed earnings breakdown and referral income.`;
    }
  }

  // Referral queries
  if (message.includes('referral') || message.includes('refer') || message.includes('invite')) {
    return `👥 <strong>Referral Program:</strong><br>
            • Invite friends to earn commissions<br>
            • Share your referral code<br>
            • Earn 10% from their activities<br>
            • Build your team for passive income<br>
            • Your team size: ${userData?.team_size || 0} members<br><br>
            The more you refer, the more you earn! 🚀`;
  }

  // Tasks queries
  if (message.includes('task') || message.includes('work') || message.includes('activity')) {
    return `✅ <strong>Daily Tasks:</strong><br>
            • Complete daily tasks to earn money<br>
            • Each task earns you KES 5-50<br>
            • Tasks refresh daily at midnight<br>
            • Consistency is key to success<br>
            • Check the "Tasks" section for available activities<br><br>
            Stay active and earn more! 🎯`;
  }

  // Withdrawal queries
  if (message.includes('withdraw') || message.includes('cash out') || message.includes('money out')) {
    return `💸 <strong>Withdrawal Process:</strong><br>
            • Go to "Withdrawal" section<br>
            • Enter amount to withdraw<br>
            • Provide bank details<br>
            • Wait for processing<br>
            • Minimum withdrawal: KES 100<br>
            • Processing time: 24-48 hours<br>
            • Withdrawal fee: KES 10<br><br>
            Your money is safe with us! 🔒`;
  }

  // Level queries
  if (message.includes('level') || message.includes('rank') || message.includes('status')) {
    return `🏆 <strong>Level System:</strong><br>
            • Beginner: 0-1000 points<br>
            • Intermediate: 1001-5000 points<br>
            • Advanced: 5001-10000 points<br>
            • Expert: 10001+ points<br>
            • Higher levels = better rewards<br>
            • Your current level: ${userData?.level || 'Beginner'}<br><br>
            Keep earning to level up! ⬆️`;
  }

  // General help
  if (message.includes('help') || message.includes('how') || message.includes('what')) {
    return `🤖 <strong>How I can help you:</strong><br>
            • Check your account balance<br>
            • Explain payment processes<br>
            • Guide investment decisions<br>
            • Show earnings breakdown<br>
            • Help with referrals<br>
            • Explain withdrawal process<br>
            • Answer general questions<br><br>
            Just ask me anything about CIC! I'm here 24/7! 😊`;
  }

  // Greetings
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return `👋 Hello! Welcome to CIC! I'm your AI assistant and I'm here to help you with any questions about your account, payments, investments, or earnings. What would you like to know?`;
  }

  // Thank you
  if (message.includes('thank') || message.includes('thanks')) {
    return `😊 You're very welcome! I'm always here to help. Is there anything else you'd like to know about CIC?`;
  }

  // Default response
  return `🤖 I understand you're asking about "${message}". I can help you with:<br>
          • Account balance and earnings<br>
          • Payment and recharge processes<br>
          • Investment opportunities<br>
          • Referral programs<br>
          • Withdrawal procedures<br>
          • Level and ranking system<br>
          • General CIC platform questions<br><br>
          Could you be more specific about what you'd like to know? I'm here to help! 😊`;
}

module.exports = aiController;
