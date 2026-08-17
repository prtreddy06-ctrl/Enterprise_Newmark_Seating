/**
 * Email Dispatching & Native Application Binary Download Service
 */

export interface EmailPayload {
  id: string;
  toName?: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  category?: string;
  sender?: string;
  groupEmailSender?: string;
  timestamp: string;
  tempPassword?: string;
  appDownloadUrl?: string;
  qrCodeData?: string;
  htmlPreview?: string;
}

/**
 * Gets the configured Outlook Group Email address from local storage
 */
export function getOutlookGroupEmail(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem("enterprizseat_outlook_group_email") || "hyderabad-workspace@newmark.com";
  }
  return "hyderabad-workspace@newmark.com";
}

/**
 * Updates the configured Outlook Group Email address in local storage
 */
export function setOutlookGroupEmail(email: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem("enterprizseat_outlook_group_email", email.trim());
  }
}

/**
 * Opens Microsoft Outlook Web (Office 365) compose window directly with pre-populated fields
 */
export function openOutlookWebClient(to: string, subject: string, bodyText: string, groupEmail?: string) {
  const cc = groupEmail || getOutlookGroupEmail();
  const outlookWebUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  window.open(outlookWebUrl, "_blank", "noopener,noreferrer");
}

/**
 * Opens Outlook Desktop application or default mail protocol client
 */
export function openOutlookDesktopClient(to: string, subject: string, bodyText: string, groupEmail?: string) {
  const cc = groupEmail || getOutlookGroupEmail();
  const mailtoUrl = `mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  window.location.href = mailtoUrl;
}

/**
 * Triggers a real browser file download using a Blob
 */
export function downloadFile(filename: string, content: string | Blob, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Converts raw URLs in plain text into clickable HTML hyperlinks
 */
export function linkifyHtml(text: string): string {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${url}</a>`;
  });
}

/**
 * Downloads Android Mobile App Web Container Installer (.html)
 * Note: Non-binary text files downloaded as .apk trigger Android "Problem parsing package".
 * This HTML package launcher opens natively on Android, Chrome, and iOS PWA without parsing errors.
 */
export function downloadMobileAPK() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://enterprizseat.corp';
  const htmlInstallerData = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>EnterprizSeat Mobile Companion Installer</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 28px; max-width: 420px; margin: 40px auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .badge { background: #2563eb; color: #fff; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    h1 { font-size: 20px; margin-top: 16px; color: #fff; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; }
    .btn { display: block; background: #2563eb; color: #fff; text-decoration: none; font-weight: bold; padding: 14px; border-radius: 12px; margin-top: 20px; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.4); }
    .btn-secondary { background: #334155; color: #e2e8f0; margin-top: 10px; }
    .instructions { background: #0f172a; border-left: 3px solid #3b82f6; text-align: left; padding: 12px; margin-top: 20px; font-size: 11px; border-radius: 6px; color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">EnterprizSeat Mobile Companion v2.4</span>
    <h1>Newmark _Hyderabad Mobile App</h1>
    <p>Mobile Desk Booking, Optical Camera QR Check-in & Asset Operations for Android & iOS.</p>
    
    <a href="${origin}" class="btn">🚀 Open Direct Mobile Web App</a>
    <a href="${origin}/manifest.json" class="btn btn-secondary">📲 Install PWA Companion</a>

    <div class="instructions">
      <strong>📱 Installation Tip for Android & iOS:</strong><br>
      To install without APK parsing errors, tap <em>"Open Direct Mobile Web App"</em> above, then in Chrome/Safari tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.
    </div>
  </div>
</body>
</html>`;
  downloadFile("EnterprizSeat_Companion_v2.4_Installer.html", htmlInstallerData, "text/html");
}

/**
 * Downloads iOS Companion App Package
 */
export function downloadMobileIPA() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://enterprizseat.corp';
  const htmlInstallerData = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>EnterprizSeat iOS Companion Installer</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 28px; max-width: 420px; margin: 40px auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .badge { background: #2563eb; color: #fff; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    h1 { font-size: 20px; margin-top: 16px; color: #fff; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; }
    .btn { display: block; background: #2563eb; color: #fff; text-decoration: none; font-weight: bold; padding: 14px; border-radius: 12px; margin-top: 20px; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.4); }
    .instructions { background: #0f172a; border-left: 3px solid #3b82f6; text-align: left; padding: 12px; margin-top: 20px; font-size: 11px; border-radius: 6px; color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">EnterprizSeat iOS TestFlight v2.4</span>
    <h1>Newmark _Hyderabad iOS App</h1>
    <p>Mobile Desk Booking, Optical Camera QR Check-in & Asset Operations for iPhone & iPad.</p>
    
    <a href="${origin}" class="btn">📱 Open Web App & Add to Home Screen</a>

    <div class="instructions">
      <strong>🍏 iOS Safari Instructions:</strong><br>
      Tap the Share icon in Safari and select <strong>"Add to Home Screen"</strong> to install as a full-screen standalone iOS App.
    </div>
  </div>
</body>
</html>`;
  downloadFile("EnterprizSeat_Companion_v2.4_iOS.html", htmlInstallerData, "text/html");
}

/**
 * Downloads Mobile User & Admin Guide PDF
 */
export function downloadUserGuidePDF() {
  const pdfData = `%PDF-1.4
%âãÏÓ
1 0 obj
<< /Title (EnterprizSeat Mobile Companion User Guide)
   /Author (EnterprizSeat Engineering)
   /Subject (Mobile QR Check-in & Desk Allocation Operating Manual)
   /CreationDate (D:20260721120000Z) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 250 >>
stream
BT
/F1 18 Tf
50 720 Td
(EnterprizSeat Workspace Management - Mobile User Guide 2026) Tj
0 -30 Td
/F1 12 Tf
(1. Scan Desk QR Codes using your phone camera) Tj
0 -20 Td
(2. Tap "Confirm Check-in" to claim your reserved desk) Tj
0 -20 Td
(3. View active IT Hardware Assets assigned to your desk) Tj
0 -20 Td
(4. Manage seat requests and view floor maps on the go) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000018 00000 n 
0000000180 00000 n 
0000000227 00000 n 
0000000284 00000 n 
0000000371 00000 n 
trailer
<< /Size 6 /Root 2 0 R >>
startxref
675
%%EOF`;
  downloadFile("EnterprizSeat_User_And_Admin_Guide_2026.pdf", pdfData, "application/pdf");
}

/**
 * Generates and downloads a formatted .eml file for local email client / outlook import
 */
export function downloadEMLEmail(payload: EmailPayload) {
  const emlContent = `From: ${payload.sender || "EnterprizSeat Automated Mailer <no-reply@enterprizseat.corp>"}
To: ${payload.toName ? `${payload.toName} <${payload.toEmail}>` : payload.toEmail}
Subject: ${payload.subject}
Date: ${new Date(payload.timestamp).toUTCString()}
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8
X-Mailer: EnterprizSeat Enterprise SMTP Relay v4.2

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { color: #2563eb; font-size: 20px; font-weight: bold; }
    .badge { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; }
    .cred-box { background: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 8px; font-family: monospace; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; margin-top: 16px; }
    .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">🏢 EnterprizSeat Workspace Management</div>
    </div>
    <span class="badge">${payload.category || "System Notification"}</span>
    <h2 style="color: #0f172a; margin-top: 16px;">${payload.subject}</h2>
    
    <p>Dear ${payload.toName || payload.toEmail},</p>
    <p style="line-height: 1.6;">${linkifyHtml(payload.bodyText).replace(/\n/g, '<br>')}</p>
    
    ${payload.tempPassword ? `
    <div class="cred-box">
      <div><strong>Login Email:</strong> ${payload.toEmail}</div>
      <div><strong>Temporary Password:</strong> <span style="color: #d97706; font-size: 16px;">${payload.tempPassword}</span></div>
    </div>
    ` : ''}

    <a href="${typeof window !== 'undefined' ? window.location.origin : '#'}" class="btn">Open EnterprizSeat Portal</a>

    <div class="footer">
      This is an automated message sent by EnterprizSeat Corporate Workspace System.<br>
      Campus: Newmark _Hyderabad • Do not reply directly to this email.
    </div>
  </div>
</body>
</html>
`;

  const filename = `Email_${payload.subject.replace(/[^a-zA-Z0-9]/g, "_")}.eml`;
  downloadFile(filename, emlContent, "message/rfc822");
}

/**
 * Opens browser default mail client (mailto:)
 */
export function openMailClient(to: string, subject: string, bodyText: string) {
  const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  window.location.href = mailtoUrl;
}

/**
 * Dispatches a global event that triggers top toast & SMTP Relay console
 */
export function dispatchEmailNotification(payload: Omit<EmailPayload, "id" | "timestamp">) {
  const groupEmail = getOutlookGroupEmail();
  const fullPayload: EmailPayload = {
    ...payload,
    id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    groupEmailSender: payload.groupEmailSender || groupEmail,
    sender: payload.sender || `EnterprizSeat Workspace <${groupEmail}>`
  };

  // Dispatch custom browser window event
  const event = new CustomEvent("enterprizseat:email_dispatched", { detail: fullPayload });
  window.dispatchEvent(event);

  return fullPayload;
}
