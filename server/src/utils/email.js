const nodemailer = require('nodemailer');

// Create transporter
let transporter;

try {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
} catch (err) {
  console.error('Email service not configured:', err.message);
}

// Send email
const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    console.warn('Email service not configured, skipping email to:', to);
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@industrialassets.com',
      to,
      subject,
      html,
      text,
    });
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('Error sending email:', err);
    return { success: false, error: err.message };
  }
};

// Email templates
const emailTemplates = {
  transferApprovalRequest: (approverName, assetName, transferDetails, approvalLink) => ({
    subject: `Transfer Approval Required: ${assetName}`,
    html: `
      <h2>Transfer Approval Required</h2>
      <p>Hello ${approverName},</p>
      <p>A new asset transfer requires your approval:</p>
      <ul>
        <li><strong>Asset:</strong> ${assetName}</li>
        <li><strong>From:</strong> ${transferDetails.from}</li>
        <li><strong>To:</strong> ${transferDetails.to}</li>
        <li><strong>Type:</strong> ${transferDetails.type}</li>
        <li><strong>Purpose:</strong> ${transferDetails.purpose || 'N/A'}</li>
      </ul>
      <p>
        <a href="${approvalLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Review & Approve
        </a>
      </p>
      <p>Or visit: ${approvalLink}</p>
      <p>Best regards,<br>Industrial Asset Management System</p>
    `,
    text: `
Transfer Approval Required: ${assetName}

Hello ${approverName},

A new asset transfer requires your approval:
- Asset: ${assetName}
- From: ${transferDetails.from}
- To: ${transferDetails.to}
- Type: ${transferDetails.type}
- Purpose: ${transferDetails.purpose || 'N/A'}

Please visit the link below to review and approve:
${approvalLink}

Best regards,
Industrial Asset Management System
    `,
  }),

  transferApproved: (userName, assetName, approverName) => ({
    subject: `Transfer Approved: ${assetName}`,
    html: `
      <h2>Transfer Approved</h2>
      <p>Hello ${userName},</p>
      <p>The following asset transfer has been approved by ${approverName}:</p>
      <p><strong>Asset:</strong> ${assetName}</p>
      <p>Best regards,<br>Industrial Asset Management System</p>
    `,
    text: `
Transfer Approved: ${assetName}

Hello ${userName},

The following asset transfer has been approved by ${approverName}:
Asset: ${assetName}

Best regards,
Industrial Asset Management System
    `,
  }),

  maintenanceDue: (assetName, dueDate) => ({
    subject: `Maintenance Due: ${assetName}`,
    html: `
      <h2>Maintenance Due</h2>
      <p>The following asset requires maintenance:</p>
      <p><strong>Asset:</strong> ${assetName}</p>
      <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
      <p>Please schedule maintenance accordingly.</p>
      <p>Best regards,<br>Industrial Asset Management System</p>
    `,
    text: `
Maintenance Due: ${assetName}

The following asset requires maintenance:
Asset: ${assetName}
Due Date: ${new Date(dueDate).toLocaleDateString()}

Please schedule maintenance accordingly.

Best regards,
Industrial Asset Management System
    `,
  }),

  warrantyExpiring: (assetName, expiryDate) => ({
    subject: `Warranty Expiring: ${assetName}`,
    html: `
      <h2>Warranty Expiring Soon</h2>
      <p>The warranty for the following asset is expiring soon:</p>
      <p><strong>Asset:</strong> ${assetName}</p>
      <p><strong>Expiry Date:</strong> ${new Date(expiryDate).toLocaleDateString()}</p>
      <p>Please consider renewing the warranty.</p>
      <p>Best regards,<br>Industrial Asset Management System</p>
    `,
    text: `
Warranty Expiring Soon: ${assetName}

The warranty for the following asset is expiring soon:
Asset: ${assetName}
Expiry Date: ${new Date(expiryDate).toLocaleDateString()}

Please consider renewing the warranty.

Best regards,
Industrial Asset Management System
    `,
  }),
};

module.exports = {
  sendEmail,
  emailTemplates,
};
