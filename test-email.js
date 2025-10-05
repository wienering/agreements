// Simple email test script
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('🧪 Testing email configuration...');
  
  console.log('📧 SMTP Config:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    from: process.env.SMTP_FROM,
    adminEmail: process.env.ADMIN_EMAIL
  });

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log('📧 Testing email connection...');
    
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@photoboothguys.ca',
      to: process.env.ADMIN_EMAIL || 'agreements@photoboothguys.ca',
      subject: '🧪 Test Email - View Alert System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>🧪 Test Email</h1>
          <p>This is a test email to verify the SMTP configuration is working.</p>
          <p>If you receive this email, the view alert system should work correctly.</p>
        </div>
      `,
    });

    console.log('✅ Email sent successfully:', result.messageId);
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

testEmail();
