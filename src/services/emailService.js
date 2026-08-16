// emailService.js - Service for sending email notifications using Resend API

// Helper to determine target email recipient (resolves sandbox/override logic)
function getRecipient(user, originalLabel = '') {
  const envOverride = import.meta.env.VITE_NOTIFICATION_EMAIL;
  const userOverride = user?.testEmailOverride;
  const targetEmail = userOverride || envOverride || user?.email;
  
  const isOverridden = !!(userOverride || envOverride);
  return {
    email: targetEmail,
    isOverridden,
    originalEmail: user?.email,
    originalLabel
  };
}

// Low-level helper to trigger email sending via API
export async function sendEmail({ to, subject, html }) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[EmailService] Notification successfully sent to: ${to}`, data);
      return data;
    }

    const errText = await response.text();
    throw new Error(errText || `Server returned status ${response.status}`);
  } catch (error) {
    console.warn(`[EmailService] Failed to send via dev proxy. Attempting direct API call fallback...`, error);
    
    // Direct API fallback (might fail due to CORS in some clients, but serves as fallback)
    try {
      const apiKey = import.meta.env.VITE_RESEND_API_KEY || '';
      const sender = import.meta.env.VITE_RESEND_FROM || 'nahid <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: sender,
          to: Array.isArray(to) ? to : [to],
          subject,
          html
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Direct API call failed');
      
      console.log(`[EmailService] Notification sent via direct fallback to: ${to}`, data);
      return data;
    } catch (fallbackError) {
      console.error('[EmailService] All send options failed.', fallbackError);
      
      // Let the developer know what to do in case of sandbox failures
      if (fallbackError.message && fallbackError.message.includes('restriction')) {
        console.info(
          '%c[EmailService TIP]%c Resend sandbox API keys can only send to verified developer accounts. ' +
          'Please set your verified Resend email address in your profile or VITE_NOTIFICATION_EMAIL in your .env file.',
          'font-weight: bold; color: #4f46e5;', 'color: inherit;'
        );
      }
      throw fallbackError;
    }
  }
}

// Generate the common wrap-around layout to keep emails styled beautifully
function buildEmailTemplate({ title, headerBg, contentHtml, footerInfo = '' }) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 20px 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            border: 1px solid rgba(226, 232, 240, 0.8);
          }
          .header {
            background: ${headerBg};
            padding: 35px 30px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .body {
            padding: 40px 35px;
          }
          .footer {
            background: #f1f5f9;
            padding: 20px 35px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid rgba(226, 232, 240, 0.8);
          }
          .button {
            display: inline-block;
            background-color: #4f46e5;
            color: #ffffff !important;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 20px;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
          }
          .info-table th {
            text-align: left;
            padding: 10px 12px;
            border-bottom: 2px solid #e2e8f0;
            color: #64748b;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .info-table td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
          }
          .info-table tr:last-child td {
            border-bottom: none;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 50px;
            font-size: 12px;
            font-weight: 600;
          }
          .badge-pending { background-color: rgba(245, 158, 11, 0.1); color: #f59e0b; }
          .badge-approved { background-color: rgba(16, 185, 129, 0.1); color: #10b981; }
          .badge-rejected { background-color: rgba(239, 68, 68, 0.1); color: #ef4444; }
          .sandbox-alert {
            background-color: rgba(79, 70, 229, 0.05);
            border: 1px dashed rgba(79, 70, 229, 0.3);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
            font-size: 12px;
            color: #4f46e5;
          }
          .rejection-notes {
            background-color: rgba(239, 68, 68, 0.05);
            border-left: 4px solid #ef4444;
            padding: 12px;
            border-radius: 4px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NextExpenses</h1>
          </div>
          <div class="body">
            ${footerInfo}
            ${contentHtml}
          </div>
          <div class="footer">
            <p>This is an automated system email sent by NextExpenses Expense Manager.</p>
            <p>&copy; 2026 NextExpenses. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Generate sandbox override header if the email was rerouted
function buildOverrideHeader(recipientInfo) {
  if (!recipientInfo.isOverridden) return '';
  return `
    <div class="sandbox-alert">
      <strong>Sandbox Routing Info:</strong> This email was originally targeted to 
      <code>${recipientInfo.originalEmail}</code> (${recipientInfo.originalLabel}) but was rerouted to your verified 
      sandbox destination (<code>${recipientInfo.email}</code>).
    </div>
  `;
}

// 1. Submit Expense: Send email to Admin
export async function sendSubmissionEmail({ expense, employee, admins, appUrl = window.location.origin }) {
  // We send the notification to all administrators
  for (const admin of admins) {
    const recInfo = getRecipient(admin, 'Admin');
    const overrideHeader = buildOverrideHeader(recInfo);
    
    const subject = `New Expense Claim Submitted: ${expense.amount} BDT - ${employee.name}`;
    const html = buildEmailTemplate({
      title: subject,
      headerBg: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
      footerInfo: overrideHeader,
      contentHtml: `
        <h2 style="margin-top: 0; font-size: 20px;">New Expense Awaiting Review</h2>
        <p>An employee has submitted a new expense claim that requires your review and approval.</p>
        
        <table class="info-table">
          <thead>
            <tr>
              <th colspan="2">Claim Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="width: 30%; font-weight: 600; color: #64748b;">Submitted By</td>
              <td>${employee.name} (${employee.email})</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #64748b;">Description</td>
              <td>${expense.description}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #64748b;">Amount</td>
              <td style="font-weight: 700; font-size: 16px; color: #4f46e5;">${expense.amount} BDT</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #64748b;">Date</td>
              <td>${expense.date}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #64748b;">Notes</td>
              <td>${expense.notes || '<em>None</em>'}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="text-align: center;">
          <a href="${appUrl}" class="button">Go to Dashboard</a>
        </div>
      `
    });

    try {
      await sendEmail({ to: recInfo.email, subject, html });
    } catch (e) {
      console.warn(`Could not dispatch submission email to admin: ${admin.email}`, e);
    }
  }
}

// 2. Approve/Reject Expense: Send email to Employee
export async function sendApprovalEmail({ expense, employee, appUrl = window.location.origin }) {
  const recInfo = getRecipient(employee, 'Employee');
  const overrideHeader = buildOverrideHeader(recInfo);
  
  const isApproved = expense.status === 'Approved';
  const badgeClass = isApproved ? 'badge-approved' : 'badge-rejected';
  
  const subject = `Expense Claim ${expense.status}: ${expense.amount} BDT`;
  const headerBg = isApproved 
    ? 'linear-gradient(135deg, #10b981 0%, #065f46 100%)' 
    : 'linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%)';

  let rejectionContent = '';
  if (!isApproved && expense.rejectionComment) {
    rejectionContent = `
      <div class="rejection-notes">
        <strong style="color: #ef4444;">Admin Rejection Reason:</strong>
        <p style="margin: 5px 0 0 0; font-style: italic;">"${expense.rejectionComment}"</p>
      </div>
    `;
  }

  const html = buildEmailTemplate({
    title: subject,
    headerBg,
    footerInfo: overrideHeader,
    contentHtml: `
      <h2 style="margin-top: 0; font-size: 20px;">Expense Claim Review Result</h2>
      <p>Your expense claim submitted on <strong>${expense.date}</strong> has been processed by an administrator.</p>
      
      <table class="info-table">
        <thead>
          <tr>
            <th colspan="2">Processing Summary</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="width: 30%; font-weight: 600; color: #64748b;">Description</td>
            <td>${expense.description}</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #64748b;">Amount</td>
            <td style="font-weight: 700; color: #0f172a;">${expense.amount} BDT</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #64748b;">Status</td>
            <td><span class="badge ${badgeClass}">${expense.status}</span></td>
          </tr>
        </tbody>
      </table>
      
      ${rejectionContent}
      
      <div style="text-align: center;">
        <a href="${appUrl}" class="button">View My Expenses</a>
      </div>
    `
  });

  return sendEmail({ to: recInfo.email, subject, html });
}

// 3. Payments (Transactions): Send email to Employee on Payment Disbursed
export async function sendTransactionEmail({ payment, employee, appUrl = window.location.origin }) {
  const recInfo = getRecipient(employee, 'Employee');
  const overrideHeader = buildOverrideHeader(recInfo);
  
  const subject = `Payment Disbursed: ${payment.amount} BDT Received`;
  const headerBg = 'linear-gradient(135deg, #10b981 0%, #047857 100%)'; // Emerald Green

  const html = buildEmailTemplate({
    title: subject,
    headerBg,
    footerInfo: overrideHeader,
    contentHtml: `
      <div style="text-align: center; margin-bottom: 24px;">
        <span class="badge badge-approved" style="font-size: 13px; padding: 6px 14px;">Payment Disbursed</span>
      </div>
      <h2 style="margin-top: 0; font-size: 20px; text-align: center;">Payment Disbursal Confirmation</h2>
      <p style="text-align: center; color: #475569; font-size: 15px; margin-bottom: 24px;">
        Hello <strong>${employee?.name || 'Employee'}</strong>, a payment of <strong>${payment.amount} BDT</strong> has been disbursed to you by the organization.
      </p>
      
      <table class="info-table">
        <thead>
          <tr>
            <th colspan="2">Disbursement Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="width: 35%; font-weight: 600; color: #64748b;">Amount Disbursed</td>
            <td style="font-weight: 700; font-size: 17px; color: #10b981;">${payment.amount} BDT</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #64748b;">Disbursal Date</td>
            <td>${payment.date}</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #64748b;">Disbursed By</td>
            <td>${payment.recordedBy || 'nahid'}</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #64748b;">Notes / Reference</td>
            <td>${payment.notes || '<em>None</em>'}</td>
          </tr>
        </tbody>
      </table>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${appUrl}" class="button" style="background-color: #10b981;">View Balance & Ledger</a>
      </div>
    `
  });

  return sendEmail({ to: recInfo.email, subject, html });
}
