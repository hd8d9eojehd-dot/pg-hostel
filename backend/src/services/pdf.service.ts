import { htmlToPdf, htmlToPdfCard } from '../config/puppeteer'
import QRCode from 'qrcode'
import { env } from '../config/env'
import { formatIST, formatISTDateTime } from '../utils/indianTime'

async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 150, margin: 1, color: { dark: '#1e293b' } })
}

export async function generateReceiptPdf(data: {
  receiptNumber: string
  studentName: string
  studentId: string
  roomNumber: string
  bedLabel: string
  amount: number
  paymentMode: string
  transactionRef?: string
  utrNumber?: string
  paidDate: Date
  invoiceDescription: string
  balance: number
  pgName: string
  pgAddress: string
  pgContact: string
  signatureUrl?: string
  lateFee?: number
}): Promise<Buffer> {
  const qr = await qrDataUrl(`Receipt: ${data.receiptNumber}`)

  const isUpiOrOnline = ['upi', 'bank_transfer', 'online'].includes(data.paymentMode)
  const utrRef = data.utrNumber ?? data.transactionRef

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; font-size: 13px; color: #1e293b; background: white; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #4f46e5; }
  .pg-name { font-size: 22px; font-weight: 700; color: #4f46e5; }
  .pg-info { font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.5; }
  .receipt-title { font-size: 18px; font-weight: 700; color: #4f46e5; text-align: center; margin: 16px 0; letter-spacing: 2px; }
  .receipt-num { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 8px 16px; text-align: center; margin-bottom: 16px; }
  .receipt-num span { font-size: 16px; font-weight: 700; color: #4338ca; font-family: monospace; }
  .student-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .info-card { background: #f8fafc; border-radius: 8px; padding: 10px 14px; }
  .info-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; }
  .info-value { font-size: 13px; font-weight: 500; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #4f46e5; color: white; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  .amount-row td { font-size: 15px; font-weight: 700; color: #059669; background: #f0fdf4; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  .qr img { width: 80px; height: 80px; }
  .qr-label { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 4px; }
  .sign-area { text-align: center; }
  .sign-img { max-height: 60px; max-width: 160px; object-fit: contain; margin-bottom: 4px; }
  .sign-line { width: 160px; border-top: 1px solid #1e293b; margin: 0 auto 4px; }
  .sign-label { font-size: 11px; color: #64748b; }
  .thank-you { text-align: center; margin-top: 12px; font-size: 13px; color: #64748b; font-style: italic; }
  .balance-badge { display: inline-block; background: ${data.balance > 0 ? '#fef3c7' : '#d1fae5'}; color: ${data.balance > 0 ? '#92400e' : '#065f46'}; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .utr-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; }
  .utr-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #3b82f6; }
  .utr-value { font-size: 14px; font-weight: 700; color: #1d4ed8; font-family: monospace; margin-top: 2px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="pg-name">${data.pgName}</div>
      <div class="pg-info">${data.pgAddress}<br>📞 ${data.pgContact}</div>
    </div>
    <div style="text-align:right; font-size:11px; color:#64748b;">
      <div>Date: ${formatIST(data.paidDate)}</div>
      <div style="margin-top:4px;">${formatISTDateTime(new Date())}</div>
    </div>
  </div>
  <div class="receipt-title">PAYMENT RECEIPT</div>
  <div class="receipt-num">Receipt No: <span>${data.receiptNumber}</span></div>
  ${isUpiOrOnline && utrRef ? `
  <div class="utr-box">
    <div class="utr-label">${data.paymentMode === 'online' ? 'Cashfree Payment ID / UTR' : 'UTR / Transaction Reference'}</div>
    <div class="utr-value">${utrRef}</div>
  </div>` : ''}
  <div class="student-row">
    <div class="info-card"><div class="info-label">Student Name</div><div class="info-value">${data.studentName}</div></div>
    <div class="info-card"><div class="info-label">Student ID</div><div class="info-value" style="font-family:monospace;">${data.studentId}</div></div>
    <div class="info-card"><div class="info-label">Room / Bed</div><div class="info-value">Room ${data.roomNumber} — Bed ${data.bedLabel}</div></div>
    <div class="info-card"><div class="info-label">Payment Mode</div><div class="info-value">${data.paymentMode.replace('_', ' ').toUpperCase()}</div></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>
      <tr><td>${data.invoiceDescription}</td><td style="text-align:right;">₹${data.amount.toLocaleString('en-IN')}</td></tr>
      ${data.lateFee && data.lateFee > 0 ? `<tr><td style="color:#dc2626;">Late Fee</td><td style="text-align:right;color:#dc2626;">₹${data.lateFee.toLocaleString('en-IN')}</td></tr>` : ''}
      <tr class="amount-row"><td style="font-weight:600;">Amount Paid</td><td style="text-align:right;">₹${data.amount.toLocaleString('en-IN')}</td></tr>
      <tr><td>Balance Remaining</td><td style="text-align:right;"><span class="balance-badge">₹${data.balance.toLocaleString('en-IN')}</span></td></tr>
    </tbody>
  </table>
  <div class="footer">
    <div class="qr"><img src="${qr}" alt="QR Code" /><div class="qr-label">Scan to verify</div></div>
    <div class="sign-area">
      ${data.signatureUrl
        ? `<img src="${data.signatureUrl}" class="sign-img" alt="Signature" />`
        : `<div class="sign-line"></div>`
      }
      <div class="sign-label">Authorised Signatory</div>
      <div class="sign-label" style="margin-top:4px; font-weight:600;">${data.pgName}</div>
    </div>
  </div>
  <div class="thank-you">Thank you for your payment! 🙏</div>
</body>
</html>`

  return htmlToPdf(html)
}

export async function generateIdCardPdf(data: {
  studentName: string
  studentId: string
  roomNumber: string
  bedLabel: string
  college: string
  course: string
  validUntil: Date
  avatarUrl?: string
  pgName: string
  pgContact: string
}): Promise<Buffer> {
  const qr = await qrDataUrl(data.studentId)

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; width: 3.375in; height: 2.125in; overflow: hidden; }
  .card { width: 100%; height: 100%; display: flex; border: 2px solid #4f46e5; border-radius: 12px; overflow: hidden; }
  .left { width: 38%; background: #4f46e5; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; gap: 8px; }
  .avatar { width: 64px; height: 64px; border-radius: 50%; background: #818cf8; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: 700; overflow: hidden; }
  .qr img { width: 56px; height: 56px; border-radius: 4px; background: white; padding: 2px; }
  .right { flex: 1; background: white; padding: 10px 12px; display: flex; flex-direction: column; justify-content: space-between; }
  .pg-name { font-size: 10px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; }
  .student-name { font-size: 15px; font-weight: 700; color: #1e293b; line-height: 1.2; margin: 4px 0; }
  .student-id { font-family: monospace; font-size: 11px; font-weight: 600; color: #4f46e5; background: #eef2ff; padding: 2px 6px; border-radius: 4px; display: inline-block; }
  .detail { font-size: 10px; color: #64748b; margin-top: 2px; }
  .detail strong { color: #1e293b; font-weight: 600; }
  .validity { font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px; }
</style>
</head>
<body>
<div class="card">
  <div class="left">
    <div class="avatar">${data.avatarUrl
      ? `<img src="${data.avatarUrl}" style="width:100%;height:100%;object-fit:cover;" />`
      : data.studentName.charAt(0).toUpperCase()
    }</div>
    <div class="qr"><img src="${qr}" alt="QR" /></div>
  </div>
  <div class="right">
    <div>
      <div class="pg-name">${data.pgName}</div>
      <div class="student-name">${data.studentName}</div>
      <div class="student-id">${data.studentId}</div>
    </div>
    <div>
      <div class="detail">Room <strong>${data.roomNumber}</strong> · Bed <strong>${data.bedLabel}</strong></div>
      <div class="detail">${data.college}</div>
      <div class="detail">${data.course}</div>
      <div class="validity">Valid until: ${formatIST(data.validUntil)} · ${data.pgContact}</div>
    </div>
  </div>
</div>
</body>
</html>`

  return htmlToPdfCard(html)
}
