// ============================================================================
// EMAIL SERVICE - AWS SES Email Sending
// ============================================================================

// Lazy load env to avoid initialization issues in browser
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

export interface PasswordResetData {
  name: string;
  email: string;
  resetUrl: string;
}

export interface PlanChangeData {
  merchantName: string;
  email: string;
  oldPlanName: string;
  newPlanName: string;
  amount: number;
  currency: string;
  billingInterval: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface SubscriptionRenewalData {
  merchantName: string;
  email: string;
  planName: string;
  amount: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  paymentMethod: string;
  transactionId?: string;
}

// ============================================================================
// EMAIL SERVICE
// ============================================================================

/**
 * Send email using AWS SES or console (for development)
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Lazy load env to avoid initialization issues in browser
  const { env } = await import('@rentalshop/env');
  
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
        return await sendEmailToConsole(options);
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
  // Lazy load env to avoid initialization issues in browser
  const { env } = await import('@rentalshop/env');
  
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
async function sendEmailToConsole(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
  // Lazy load env to avoid initialization issues in browser
  const { env } = await import('@rentalshop/env');
  
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
  // Lazy load env to avoid initialization issues in browser
  const { env } = await import('@rentalshop/env');
  
  // Use CLIENT_URL so the link goes to client app first, which is more trusted by browsers
  // The client app will then call the API to verify the token
  // IMPORTANT: Always use HTTPS for production to avoid browser warnings
  let clientUrl = env.CLIENT_URL || 'http://localhost:3000';
  
  // Ensure HTTPS in production (except localhost)
  if (process.env.NODE_ENV === 'production' && !clientUrl.includes('localhost')) {
    clientUrl = clientUrl.replace(/^http:/, 'https:');
  }
  
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

/**
 * Generate password reset email HTML
 */
export function generatePasswordResetEmail(data: PasswordResetData): string {
  const { name, email, resetUrl } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt lại mật khẩu của bạn</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 28px;">AnyRent</h1>
      <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Hệ thống quản lý cho thuê</p>
    </div>
    
    <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Đặt lại mật khẩu của bạn</h2>
    
    <p style="color: #374151; font-size: 16px;">Xin chào <strong>${name}</strong>,</p>
    
    <p style="color: #374151; font-size: 16px;">
      Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại AnyRent. 
      Để tạo mật khẩu mới, vui lòng nhấp vào nút bên dưới:
    </p>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${resetUrl}" 
         style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; 
                padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; 
                box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
        Đặt lại mật khẩu
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      Nếu nút không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt của mình:
    </p>
    
    <p style="color: #2563eb; font-size: 14px; word-break: break-all; background-color: #f3f4f6; 
              padding: 12px; border-radius: 4px; margin: 10px 0;">
      ${resetUrl}
    </p>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      <strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, 
      vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.
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
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Lazy load env to avoid initialization issues in browser
  const { env } = await import('@rentalshop/env');
  
  // Use CLIENT_URL for password reset link (users reset password via client app)
  const clientUrl = env.CLIENT_URL || env.ADMIN_URL || 'http://localhost:3000';
  const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

  const html = generatePasswordResetEmail({
    name,
    email,
    resetUrl,
  });

  return await sendEmail({
    to: email,
    subject: 'Đặt lại mật khẩu của bạn - AnyRent',
    html,
  });
}

/**
 * Generate plan change notification email HTML
 */
export function generatePlanChangeEmail(data: PlanChangeData): string {
  const { merchantName, oldPlanName, newPlanName, amount, currency, billingInterval, periodStart, periodEnd } = data;
  
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(new Date(date));
  };

  const getBillingIntervalText = (interval: string) => {
    const intervals: Record<string, string> = {
      'monthly': 'hàng tháng',
      'quarterly': '3 tháng',
      'semi_annual': '6 tháng',
      'annual': 'hàng năm'
    };
    return intervals[interval] || interval;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thay đổi gói đăng ký</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 28px;">AnyRent</h1>
      <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Hệ thống quản lý cho thuê</p>
    </div>
    
    <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Gói đăng ký đã được thay đổi</h2>
    
    <p style="color: #374151; font-size: 16px;">Xin chào <strong>${merchantName}</strong>,</p>
    
    <p style="color: #374151; font-size: 16px;">
      Gói đăng ký của bạn đã được thay đổi thành công. Dưới đây là thông tin chi tiết:
    </p>
    
    <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 30px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Gói cũ:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${oldPlanName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Gói mới:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #2563eb;">${newPlanName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Chu kỳ thanh toán:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${getBillingIntervalText(billingInterval)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Ngày bắt đầu:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${formatDate(periodStart)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Ngày kết thúc:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${formatDate(periodEnd)}</td>
        </tr>
      </table>
    </div>
    
    <p style="color: #374151; font-size: 16px;">
      Gói đăng ký mới của bạn đã được kích hoạt và sẽ có hiệu lực ngay lập tức. 
      Bạn có thể tiếp tục sử dụng tất cả các tính năng của gói mới.
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
 * Send plan change notification email
 */
export async function sendPlanChangeEmail(
  data: PlanChangeData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = generatePlanChangeEmail(data);

  return await sendEmail({
    to: data.email,
    subject: `Gói đăng ký đã được thay đổi - ${data.newPlanName}`,
    html,
  });
}

/**
 * Generate subscription renewal notification email HTML
 */
export function generateSubscriptionRenewalEmail(data: SubscriptionRenewalData): string {
  const { merchantName, planName, amount, currency, periodStart, periodEnd, paymentMethod, transactionId } = data;
  
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(new Date(date));
  };

  const getPaymentMethodText = (method: string) => {
    const methods: Record<string, string> = {
      'STRIPE': 'Thẻ tín dụng/Ghi nợ',
      'TRANSFER': 'Chuyển khoản ngân hàng',
      'CASH': 'Tiền mặt'
    };
    return methods[method] || method;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gia hạn đăng ký thành công</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 28px;">AnyRent</h1>
      <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Hệ thống quản lý cho thuê</p>
    </div>
    
    <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Gia hạn đăng ký thành công</h2>
    
    <p style="color: #374151; font-size: 16px;">Xin chào <strong>${merchantName}</strong>,</p>
    
    <p style="color: #374151; font-size: 16px;">
      Gói đăng ký của bạn đã được gia hạn thành công. Cảm ơn bạn đã tiếp tục sử dụng dịch vụ của chúng tôi!
    </p>
    
    <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 30px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Gói đăng ký:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${planName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phương thức thanh toán:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${getPaymentMethodText(paymentMethod)}</td>
        </tr>
        ${transactionId ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Mã giao dịch:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827; font-family: monospace; font-size: 12px;">${transactionId}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Ngày bắt đầu:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${formatDate(periodStart)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Ngày kết thúc:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${formatDate(periodEnd)}</td>
        </tr>
      </table>
    </div>
    
    <p style="color: #374151; font-size: 16px;">
      Gói đăng ký của bạn đã được gia hạn và sẽ tiếp tục hoạt động cho đến ngày ${formatDate(periodEnd)}. 
      Bạn có thể tiếp tục sử dụng tất cả các tính năng của gói đăng ký.
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
 * Send subscription renewal notification email
 */
export async function sendSubscriptionRenewalEmail(
  data: SubscriptionRenewalData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = generateSubscriptionRenewalEmail(data);

  return await sendEmail({
    to: data.email,
    subject: `Gia hạn đăng ký thành công - ${data.planName}`,
    html,
  });
}
