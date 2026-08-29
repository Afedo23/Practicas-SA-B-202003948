import nodemailer, { Transporter } from "nodemailer";

/**
 * SRP: única responsabilidad es enviar correo. No sabe nada de JWT, de
 * usuarios ni de la regla de negocio "avisar al hacer login" — eso vive
 * en AuthService, que solo depende de este contrato mínimo.
 */
export interface IEmailService {
  enviarTokenAcceso(destinatario: string, username: string, token: string): Promise<void>;
}

export class SmtpEmailService implements IEmailService {
  private transporter: Transporter;
  private readonly from: string;
  private readonly habilitado: boolean;

  constructor() {
    const user = process.env.SMTP_USER || undefined;
    const pass = process.env.SMTP_PASS || undefined;
    // SMTP_ENABLED distingue "no configurado todavía" (no enviar nada) de
    // "configurado sin autenticación" (Mailpit en local no pide user/pass).
    // Gmail real SÍ necesita user+pass; Mailpit no necesita ninguno.
    this.habilitado = process.env.SMTP_ENABLED === "true";
    this.from = user || "sistema-solicitudes@local.test";
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // usa STARTTLS en el puerto 587 (Gmail); Mailpit no usa TLS y lo ignora
      ignoreTLS: !user, // Mailpit no ofrece TLS; Gmail sí
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async enviarTokenAcceso(destinatario: string, username: string, token: string): Promise<void> {
    if (!this.habilitado) {
      console.warn("[email] SMTP_ENABLED=false, se omite el envío de correo");
      return;
    }
    try {
      await this.transporter.sendMail({
        from: `Sistema de Solicitudes <${this.from}>`,
        to: destinatario,
        subject: "Tu acceso al Sistema de Solicitudes",
        text:
          `Hola ${username},\n\n` +
          `Iniciaste sesión correctamente. Tu token de acceso (válido por el tiempo configurado) es:\n\n` +
          `${token}\n\n` +
          `Si no fuiste vos, cambiá tu contraseña de inmediato.`,
        html:
          `<p>Hola <strong>${username}</strong>,</p>` +
          `<p>Iniciaste sesión correctamente. Tu token de acceso es:</p>` +
          `<pre style="background:#f4f4f4;padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-all;">${token}</pre>` +
          `<p>Si no fuiste vos, cambiá tu contraseña de inmediato.</p>`,
      });
      console.log(`[email] token de acceso enviado a ${destinatario}`);
    } catch (err) {
      // Un fallo de correo NUNCA debe hacer fallar el login: el usuario ya
      // se autenticó correctamente, solo se pierde el aviso por correo.
      console.error("[email] error enviando token de acceso:", err);
    }
  }
}
