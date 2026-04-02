import nodemailer from "nodemailer";

function trim(value) {
  return `${value || ""}`.trim();
}

export function isEmailConfigured() {
  return Boolean(
    trim(process.env.FLOW_SMTP_HOST)
    && trim(process.env.FLOW_SMTP_PORT)
    && trim(process.env.FLOW_SMTP_USER)
    && trim(process.env.FLOW_SMTP_PASS)
    && trim(process.env.FLOW_SMTP_FROM),
  );
}

function createTransport() {
  if (!isEmailConfigured()) {
    const error = new Error("SMTP admin non configuré");
    error.status = 400;
    throw error;
  }

  return nodemailer.createTransport({
    host: trim(process.env.FLOW_SMTP_HOST),
    port: parseInt(trim(process.env.FLOW_SMTP_PORT), 10) || 587,
    secure: `${process.env.FLOW_SMTP_SECURE || ""}` === "true",
    auth: {
      user: trim(process.env.FLOW_SMTP_USER),
      pass: trim(process.env.FLOW_SMTP_PASS),
    },
  });
}

export async function sendTransactionalAdminEmail({ to, subject, text, html }) {
  const transport = createTransport();
  await transport.sendMail({
    from: trim(process.env.FLOW_SMTP_FROM),
    to: trim(to),
    subject: trim(subject),
    text: trim(text),
    html: html || `<p>${trim(text).replace(/\n/g, "<br/>")}</p>`,
  });
}
