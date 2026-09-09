import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

async function testEmailWithAttachment() {
  console.log('Testing live email dispatch with attached resume PDF...');
  
  const resumePath = path.resolve('public/Vishal_Nishad_Resume.pdf');
  if (!fs.existsSync(resumePath)) {
    console.error('Resume PDF not found at:', resumePath);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: (env.SMTP_PASS || '').replace(/\s+/g, ''),
    },
  });

  const mailOptions = {
    from: `"Vishal Nishad" <${env.SMTP_USER}>`,
    to: env.SMTP_USER, // sends to vishalni2005@gmail.com
    subject: 'Job Application & Attached Resume Test - Vishal Nishad',
    text: 'Hi,\n\nPlease find attached my resume (Vishal_Nishad_Resume.pdf).\n\nBest,\nVishal Nishad\nhttps://github.com/MrSanito',
    html: '<p>Hi,</p><p>Please find attached my resume (<b>Vishal_Nishad_Resume.pdf</b>).</p><p>Best regards,<br/><b>Vishal Nishad</b><br/><a href="https://github.com/MrSanito">GitHub: github.com/MrSanito</a></p>',
    attachments: [
      {
        filename: 'Vishal_Nishad_Resume.pdf',
        path: resumePath,
        contentType: 'application/pdf',
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Email sent with attachment successfully!');
  console.log('Message ID:', info.messageId);
  console.log('Accepted Recipients:', info.accepted);
}

testEmailWithAttachment().catch(console.error);
