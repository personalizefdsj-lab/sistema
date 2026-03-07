import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendPasswordResetEmail(to: string, code: string, userName: string): Promise<boolean> {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@gestordepedidos.com";

  if (!t) {
    console.log(`[EMAIL-DEV] Código de recuperação para ${to}: ${code}`);
    return true;
  }

  try {
    await t.sendMail({
      from,
      to,
      subject: "Recuperação de Senha - Gestor de Pedidos",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e293b;">Recuperação de Senha</h2>
          <p>Olá <strong>${userName}</strong>,</p>
          <p>Você solicitou a recuperação de sua senha. Use o código abaixo para criar uma nova senha:</p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b;">${code}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">Este código expira em 15 minutos.</p>
          <p style="color: #64748b; font-size: 14px;">Se você não solicitou esta recuperação, ignore este e-mail.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">Gestor de Pedidos</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[EMAIL] Erro ao enviar e-mail:", err);
    return false;
  }
}
