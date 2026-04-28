const nodemailer = require('nodemailer');

async function sendReport(name, email, pdfBuffer) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"DISC Assessment" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your DISC Personality Report — ${name}`,
    text: `Hi ${name},\n\nThank you for completing the DISC Personality Assessment. Please find your personalized report attached.\n\nBest regards,\nDISC Assessment Tool`,
    html: `<p>Hi <strong>${name}</strong>,</p><p>Thank you for completing the DISC Personality Assessment. Please find your personalized report attached.</p><p>Best regards,<br>DISC Assessment Tool</p>`,
    attachments: [
      {
        filename: `DISC-Report-${name.replace(/\s+/g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

module.exports = { sendReport };
