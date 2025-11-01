// ============================================================================
// EMAIL SERVICE - AWS SES Email Sending
// ============================================================================

import { env } from '@rentalshop/env';
// AWS SES will be imported dynamically to avoid requiring it if not used

// ============================================================================
// TYPES
// ============================================================================

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
}

export interface EmailVerificationData {
  name: string;
  email: string;
  verificationUrl: string;
}

// ============================================================================
// EMAIL SERVICE
// ============================================================================

/**
 * Send email using AWS SES or console (for development)
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const emailProvider = env.EMAIL_PROVIDER;
  const fromEmail = options.from || env.EMAIL_FROM;
  const fromName = options.fromName || 'AnyRent';

  console.log('📧 [Email Service] Sending email:', {
    to: options.to,
    subject: options.subject,
    provider: emailProvider,
    from: fromEmail,
  });

  try {
    switch (emailProvider) {
      case 'ses':
        return await sendEmailWithSES({
          ...options,
          from: fromEmail,
          fromName,
        });

      case 'console':
      default:
        // Console mode for development/testing
        console.log('ℹ️ [Email Service] Using console mode (email will be logged, not sent)');
        return sendEmailToConsole(options);
    }
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Failed to send email';
    console.error('❌ [Email Service] Email sending failed:', {
      error: errorMessage,
      errorType: error?.constructor?.name,
      errorCode: error?.code,
      stack: error?.stack,
      provider: emailProvider,
      from: fromEmail,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}


/**
 * Send email using AWS SES
 */
async function sendEmailWithSES(options: EmailOptions & { fromName: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
  const AWS_SES_REGION = env.AWS_SES_REGION || 'us-east-1';
  
  // Debug: Log region source
  console.log('🔍 [Email Service - SES] Region configuration:', {
    fromEnv: env.AWS_SES_REGION,
    fromProcessEnv: process.env.AWS_SES_REGION,
    finalRegion: AWS_SES_REGION,
  });

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    const errorMsg = 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.';
    console.error('❌ [Email Service - SES]', errorMsg);
    console.error('💡 [Email Service - SES] Hint: Set EMAIL_PROVIDER=console for development without AWS credentials');
    return {
      success: false,
      error: errorMsg,
    };
  }

  try {
    console.log('🔧 [Email Service - SES] Initializing AWS SES client...', {
      region: AWS_SES_REGION,
      from: options.from,
      to: options.to,
    });

    // Use AWS SDK v3 for SES (dynamically imported)
    let SESClient, SendEmailCommand;
    try {
      // @ts-ignore - AWS SDK will be installed
      const awsSES = await import('@aws-sdk/client-ses');
      SESClient = awsSES.SESClient;
      SendEmailCommand = awsSES.SendEmailCommand;
    } catch (importError: any) {
      const errorMsg = `Failed to import AWS SES SDK: ${importError?.message || 'Unknown import error'}. Please ensure @aws-sdk/client-ses is installed.`;
      console.error('❌ [Email Service - SES]', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
    
    const sesClient = new SESClient({
      region: AWS_SES_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    const command = new SendEmailCommand({
      Source: `${options.fromName} <${options.from}>`,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: options.html,
            Charset: 'UTF-8',
          },
          Text: {
            Data: options.text || stripHtml(options.html),
            Charset: 'UTF-8',
          },
        },
      },
    });

    console.log('📤 [Email Service - SES] Sending email via AWS SES...');
    const result = await sesClient.send(command);
    console.log('✅ [Email Service - SES] Email sent successfully:', {
      messageId: result.MessageId,
      to: options.to
    });
    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Failed to send email via AWS SES';
    const errorCode = error?.code || error?.name || 'UNKNOWN_ERROR';
    
    console.error('❌ [Email Service - SES] Error:', {
      message: errorMessage,
      code: errorCode,
      errorType: error?.constructor?.name,
      region: AWS_SES_REGION,
      fromEmail: options.from,
      stack: error?.stack,
    });
    
    // Provide helpful error messages for common AWS SES errors
    let userFriendlyError = errorMessage;
    if (errorCode === 'MessageRejected' || errorCode === 'InvalidParameterValue' && errorMessage.includes('rejected')) {
      userFriendlyError = `Email was rejected by AWS SES (${errorCode}). Please verify that the sender email "${options.from}" is verified in AWS SES console.`;
    } else if (errorCode === 'InvalidParameterValue') {
      userFriendlyError = `Invalid email configuration (${errorCode}). Please check EMAIL_FROM="${options.from}" and AWS_SES_REGION="${AWS_SES_REGION}" settings.`;
    } else if (errorCode === 'AccessDenied' || errorCode === 'UnauthorizedOperation') {
      userFriendlyError = `AWS SES access denied (${errorCode}). Please check AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) and IAM permissions for SES.`;
    } else if (errorCode === 'CredentialsError' || errorMessage.includes('credentials')) {
      userFriendlyError = `AWS credentials error (${errorCode}). Please verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct.`;
    } else if (errorCode === 'NetworkError' || errorMessage.includes('network') || errorMessage.includes('timeout')) {
      userFriendlyError = `Network error connecting to AWS SES (${errorCode}). Please check your internet connection and AWS SES region "${AWS_SES_REGION}".`;
    } else {
      userFriendlyError = `AWS SES error (${errorCode}): ${errorMessage}`;
    }
    
    return {
      success: false,
      error: userFriendlyError,
    };
  }
}


/**
 * Send email to console (for development/testing)
 */
function sendEmailToConsole(options: EmailOptions): { success: boolean; messageId?: string } {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 EMAIL (Console Mode)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`From: ${options.from || env.EMAIL_FROM}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('HTML Content:');
  console.log(options.html);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return {
    success: true,
    messageId: `console-${Date.now()}`,
  };
}

/**
 * Strip HTML tags to create plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Generate email verification email HTML
 */
export function generateVerificationEmail(data: EmailVerificationData): string {
  const { name, email, verificationUrl } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác thực email của bạn</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 28px;">AnyRent</h1>
      <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Hệ thống quản lý cho thuê</p>
    </div>
    
    <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Xác thực email của bạn</h2>
    
    <p style="color: #374151; font-size: 16px;">Xin chào <strong>${name}</strong>,</p>
    
    <p style="color: #374151; font-size: 16px;">
      Cảm ơn bạn đã đăng ký tài khoản tại AnyRent! Để hoàn tất quá trình đăng ký và kích hoạt tài khoản của bạn, 
      vui lòng xác thực địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:
    </p>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${verificationUrl}" 
         style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; 
                padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; 
                box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
        Xác thực email
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      Nếu nút không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt của mình:
    </p>
    
    <p style="color: #2563eb; font-size: 14px; word-break: break-all; background-color: #f3f4f6; 
              padding: 12px; border-radius: 4px; margin: 10px 0;">
      ${verificationUrl}
    </p>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      <strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau 24 giờ. Nếu bạn không tạo tài khoản này, 
      vui lòng bỏ qua email này.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      © ${new Date().getFullYear()} AnyRent. Tất cả các quyền được bảo lưu.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const clientUrl = env.CLIENT_URL;
  const verificationUrl = `${clientUrl}/verify-email?token=${verificationToken}`;

  const html = generateVerificationEmail({
    name,
    email,
    verificationUrl,
  });

  return await sendEmail({
    to: email,
    subject: 'Xác thực email của bạn - AnyRent',
    html,
  });
}

