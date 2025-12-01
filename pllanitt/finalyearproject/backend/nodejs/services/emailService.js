const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Check if we have valid email credentials
    const hasValidCredentials = process.env.EMAIL_USER && 
                               process.env.EMAIL_PASS && 
                               process.env.EMAIL_USER !== 'your-email@gmail.com' &&
                               process.env.EMAIL_PASS !== 'your-app-password';

    if (!hasValidCredentials) {
      console.log('📧 Email service running in DEVELOPMENT MODE');
      console.log('📧 To enable real email sending, configure EMAIL_USER and EMAIL_PASS in .env file');
      this.transporter = null;
      return;
    }

    // For development, we'll use Gmail SMTP
    // In production, you should use a proper email service like SendGrid, AWS SES, etc.
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use App Password for Gmail
      }
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.log('❌ Email service configuration error:', error.message);
        console.log('📧 Please check your EMAIL_USER and EMAIL_PASS in .env file');
        this.transporter = null; // Disable email sending if verification fails
      } else {
        console.log('✅ Email service is ready to send messages');
      }
    });
  }

  async sendPasswordResetEmail(email, resetToken, userName = 'User') {
    try {
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
      
      // If no transporter (development mode), just log the reset link
      if (!this.transporter) {
        console.log('📧 DEVELOPMENT MODE: Password reset email would be sent to:', email);
        console.log('📧 Reset Link:', resetLink);
        console.log('📧 Email Template Preview:');
        console.log('📧 Subject: 🔐 Password Reset Request - PLAN-it');
        console.log('📧 Recipient:', userName, `<${email}>`);
        return { success: true, messageId: 'dev-mode', resetLink };
      }
      
      const mailOptions = {
        from: {
          name: 'PLAN-it Team',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: '🔐 Password Reset Request - PLAN-it',
        html: this.getPasswordResetEmailTemplate(userName, resetLink),
        text: this.getPasswordResetEmailText(userName, resetLink)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  getPasswordResetEmailTemplate(userName, resetLink) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - PLAN-it</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #3f7af5;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #3f7af5;
                margin-bottom: 10px;
            }
            .title {
                color: #2d3748;
                font-size: 24px;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .reset-button {
                display: inline-block;
                background-color: #3f7af5;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                margin: 20px 0;
                transition: background-color 0.3s ease;
            }
            .reset-button:hover {
                background-color: #2c5aa0;
            }
            .warning {
                background-color: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                color: #dc2626;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                font-size: 14px;
                color: #64748b;
                text-align: center;
            }
            .link {
                color: #3f7af5;
                word-break: break-all;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏗️ PLAN-it</div>
                <h1 class="title">Password Reset Request</h1>
            </div>
            
            <div class="content">
                <p>Hello ${userName},</p>
                
                <p>We received a request to reset your password for your PLAN-it account. If you made this request, click the button below to reset your password:</p>
                
                <div style="text-align: center;">
                    <a href="${resetLink}" class="reset-button">Reset My Password</a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p class="link">${resetLink}</p>
                
                <div class="warning">
                    <strong>⚠️ Important Security Information:</strong>
                    <ul>
                        <li>This link will expire in <strong>1 hour</strong></li>
                        <li>This link can only be used <strong>once</strong></li>
                        <li>If you didn't request this password reset, please ignore this email</li>
                        <li>Your password will remain unchanged until you create a new one</li>
                    </ul>
                </div>
                
                <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
            </div>
            
            <div class="footer">
                <p>This email was sent from PLAN-it Urban Planning Platform.</p>
                <p>If you have any questions, please contact our support team.</p>
                <p>© 2024 PLAN-it. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getPasswordResetEmailText(userName, resetLink) {
    return `
PLAN-it - Password Reset Request

Hello ${userName},

We received a request to reset your password for your PLAN-it account.

To reset your password, please visit the following link:
${resetLink}

IMPORTANT SECURITY INFORMATION:
- This link will expire in 1 hour
- This link can only be used once
- If you didn't request this password reset, please ignore this email
- Your password will remain unchanged until you create a new one

If you're having trouble with the link, copy and paste it into your web browser.

This email was sent from PLAN-it Urban Planning Platform.
If you have any questions, please contact our support team.

© 2024 PLAN-it. All rights reserved.
    `;
  }

  async sendWelcomeEmail(email, userName) {
    try {
      const mailOptions = {
        from: {
          name: 'PLAN-it Team',
          address: process.env.EMAIL_USER || 'noreply@planit.com'
        },
        to: email,
        subject: '🎉 Welcome to PLAN-it - Your Urban Planning Journey Begins!',
        html: this.getWelcomeEmailTemplate(userName),
        text: this.getWelcomeEmailText(userName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  getWelcomeEmailTemplate(userName) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to PLAN-it</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #3f7af5;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #3f7af5;
                margin-bottom: 10px;
            }
            .title {
                color: #2d3748;
                font-size: 24px;
                margin-bottom: 20px;
            }
            .feature {
                background-color: #f8fafc;
                border-left: 4px solid #3f7af5;
                padding: 15px;
                margin: 15px 0;
                border-radius: 0 8px 8px 0;
            }
            .cta-button {
                display: inline-block;
                background-color: #3f7af5;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                margin: 20px 0;
                transition: background-color 0.3s ease;
            }
            .cta-button:hover {
                background-color: #2c5aa0;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                font-size: 14px;
                color: #64748b;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏗️ PLAN-it</div>
                <h1 class="title">Welcome to PLAN-it!</h1>
            </div>
            
            <div class="content">
                <p>Hello ${userName},</p>
                
                <p>Welcome to PLAN-it, the cutting-edge urban planning platform that's revolutionizing how we design and develop cities!</p>
                
                <p>We're excited to have you join our community of urban planners, architects, and city developers who are shaping the future of our cities.</p>
                
                <h3>🚀 What you can do with PLAN-it:</h3>
                
                <div class="feature">
                    <strong>🏔️ Terrain Analysis:</strong> Analyze elevation, slope, and drainage patterns with advanced DEM processing
                </div>
                
                <div class="feature">
                    <strong>🎯 Land Suitability:</strong> AI-powered land suitability analysis for optimal development planning
                </div>
                
                <div class="feature">
                    <strong>🏘️ Intelligent Zoning:</strong> Generate professional 2D zoning layouts based on terrain and regulations
                </div>
                
                <div class="feature">
                    <strong>📊 Advanced Analytics:</strong> Comprehensive reports and visualizations for informed decision-making
                </div>
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="cta-button">Start Planning Now</a>
                </div>
                
                <p>Need help getting started? Our support team is here to assist you every step of the way.</p>
            </div>
            
            <div class="footer">
                <p>Thank you for choosing PLAN-it for your urban planning needs.</p>
                <p>© 2024 PLAN-it. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getWelcomeEmailText(userName) {
    return `
Welcome to PLAN-it!

Hello ${userName},

Welcome to PLAN-it, the cutting-edge urban planning platform that's revolutionizing how we design and develop cities!

We're excited to have you join our community of urban planners, architects, and city developers who are shaping the future of our cities.

What you can do with PLAN-it:
- Terrain Analysis: Analyze elevation, slope, and drainage patterns with advanced DEM processing
- Land Suitability: AI-powered land suitability analysis for optimal development planning
- Intelligent Zoning: Generate professional 2D zoning layouts based on terrain and regulations
- Advanced Analytics: Comprehensive reports and visualizations for informed decision-making

Get started: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard

Need help getting started? Our support team is here to assist you every step of the way.

Thank you for choosing PLAN-it for your urban planning needs.

© 2024 PLAN-it. All rights reserved.
    `;
  }

  async sendNotificationEmail(email, userName, title, message, link = null) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const actionLink = link ? `${frontendUrl}${link}` : `${frontendUrl}/dashboard`;

      // If no transporter (development mode), just log
      if (!this.transporter) {
        console.log('📧 DEVELOPMENT MODE: Notification email would be sent to:', email);
        console.log('📧 Subject:', title);
        console.log('📧 Message:', message);
        console.log('📧 Link:', actionLink);
        return { success: true, messageId: 'dev-mode' };
      }

      const mailOptions = {
        from: {
          name: 'PLAN-it Notifications',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: `🔔 ${title} - PLAN-it`,
        html: this.getNotificationEmailTemplate(userName, title, message, actionLink),
        text: this.getNotificationEmailText(userName, title, message, actionLink)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Notification email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send notification email:', error);
      return { success: false, error: error.message };
    }
  }

  getNotificationEmailTemplate(userName, title, message, actionLink) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - PLAN-it</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #3f7af5;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #3f7af5;
                margin-bottom: 10px;
            }
            .title {
                color: #2d3748;
                font-size: 24px;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .message-box {
                background-color: #f8fafc;
                border-left: 4px solid #3f7af5;
                padding: 15px;
                margin: 20px 0;
                border-radius: 0 8px 8px 0;
            }
            .action-button {
                display: inline-block;
                background-color: #3f7af5;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                margin: 20px 0;
                transition: background-color 0.3s ease;
            }
            .action-button:hover {
                background-color: #2c5aa0;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                font-size: 14px;
                color: #64748b;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏗️ PLAN-it</div>
                <h1 class="title">${title}</h1>
            </div>
            
            <div class="content">
                <p>Hello ${userName},</p>
                
                <div class="message-box">
                    <p>${message}</p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${actionLink}" class="action-button">View Details</a>
                </div>
                
                <p>You can also view this notification in your PLAN-it dashboard.</p>
            </div>
            
            <div class="footer">
                <p>This email was sent from PLAN-it Urban Planning Platform.</p>
                <p>© 2024 PLAN-it. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getNotificationEmailText(userName, title, message, actionLink) {
    return `
${title} - PLAN-it

Hello ${userName},

${message}

View Details: ${actionLink}

You can also view this notification in your PLAN-it dashboard.

This email was sent from PLAN-it Urban Planning Platform.
© 2024 PLAN-it. All rights reserved.
    `;
  }
}

module.exports = new EmailService();
