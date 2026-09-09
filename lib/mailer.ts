import nodemailer from 'nodemailer';
import { getAppSettings } from './upstash';

import fs from 'fs';
import path from 'path';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
}

export function getResumeAttachment(): { filename: string; path: string; contentType: string } | null {
  const candidatePaths = [
    process.env.RESUME_PATH,
    path.join(process.cwd(), 'public', 'Vishal_Nishad_Resume.pdf'),
    path.join(process.cwd(), 'RealData', 'Vishal Resume 09_09_2026.pdf'),
    path.join(process.cwd(), 'public', 'resume.pdf'),
    path.join(process.cwd(), 'RealData', 'resume.pdf'),
    path.join(process.cwd(), 'resume.pdf'),
  ].filter((p): p is string => Boolean(p && typeof p === 'string'));

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return {
        filename: 'Vishal_Nishad_Resume.pdf',
        path: p,
        contentType: 'application/pdf',
      };
    }
  }

  return null;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isSimulated: boolean;
  hasAttachment?: boolean;
  timestamp: string;
  latencyMs: number;
}

export function getEmailTransporter() {
  const settings = getAppSettings();
  if (!settings.smtpUser || !settings.smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });
}

export async function sendEmailAsync(options: EmailOptions): Promise<SendResult> {
  const startTime = Date.now();
  const settings = getAppSettings();
  const transporter = getEmailTransporter();

  // If no SMTP configured, simulate email transmission
  if (!transporter) {
    // Simulate real network dispatch delay (150ms - 350ms)
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 150));
    const latencyMs = Date.now() - startTime;
    
    return {
      success: true,
      messageId: `sim-mail-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      isSimulated: true,
      timestamp: new Date().toISOString(),
      latencyMs,
    };
  }

  try {
    // Ensure fromAddress is valid and matches authenticated account (prevents Gmail 421 anti-spoofing rejection)
    let fromAddress = options.from || settings.smtpFrom || settings.smtpUser;
    if (!fromAddress || fromAddress.includes('example.com') || fromAddress.includes('applicant@')) {
      fromAddress = settings.smtpUser ? `Vishal Nishad <${settings.smtpUser}>` : (fromAddress || 'vishalni2005@gmail.com');
    }

    // Clean and normalize recipient list (handling multiple comma-separated emails)
    const rawTo = options.to || '';
    const cleanRecipients = rawTo
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter((e) => e && e.includes('@') && !e.includes('Not publicly listed'));
    
    const targetTo = cleanRecipients.length > 0 ? cleanRecipients.join(', ') : rawTo;

    const defaultResume = getResumeAttachment();
    const attachments = options.attachments || [];
    if (defaultResume && !attachments.some((a) => a.filename.includes('Resume'))) {
      attachments.push(defaultResume);
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to: targetTo,
      subject: options.subject,
      text: options.text || options.html?.replace(/<[^>]*>?/gm, ''),
      html: options.html,
      replyTo: options.replyTo || fromAddress,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      messageId: info.messageId,
      isSimulated: false,
      timestamp: new Date().toISOString(),
      latencyMs,
    };
  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : String(error);
    const isGoogle421 = errMsg.includes('421') || (error as { responseCode?: number })?.responseCode === 421;
    
    if (isGoogle421) {
      console.warn('⚠️ Google SMTP 421 Rate Limit / Temporary Deferral encountered. Google throttled or held message at DATA command:', errMsg);
    } else {
      console.error('Email sending failed:', error);
    }

    return {
      success: false,
      error: isGoogle421
        ? 'Gmail 421 Temporary System Problem: Google burst limit or sender rate limit reached. Delaying next dispatch.'
        : errMsg,
      isSimulated: false,
      timestamp: new Date().toISOString(),
      latencyMs,
    };
  }
}

export async function testSmtpConnection(): Promise<{ success: boolean; message: string }> {
  const transporter = getEmailTransporter();
  if (!transporter) {
    return { success: false, message: 'SMTP credentials (user/pass) not configured.' };
  }

  try {
    await transporter.verify();
    return { success: true, message: 'SMTP Connection verified successfully!' };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'SMTP verification failed',
    };
  }
}
