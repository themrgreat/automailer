const nodemailer = require("nodemailer");

class ZohoMailProvider {
  constructor(opts) {
    const port = Number(opts.port) || 465;
    this.transporter = nodemailer.createTransport({
      host: opts.host || "smtp.zoho.com",
      port,
      secure: port === 465,
      auth: { user: opts.user, pass: opts.appPassword },
    });
    this.fromAddress = opts.fromName ? `"${opts.fromName}" <${opts.user}>` : opts.user;
  }

  // Cheap connectivity/credentials check — opens and authenticates the SMTP connection
  // without sending anything.
  static async testConnection(values) {
    const port = Number(values.port) || 465;
    const transporter = nodemailer.createTransport({
      host: values.host || "smtp.zoho.com",
      port,
      secure: port === 465,
      auth: { user: values.user, pass: values.appPassword },
    });
    await transporter.verify();
  }

  async sendEmail(input) {
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.body,
      html: input.body.replace(/\n/g, "<br/>"),
    });
  }
}

module.exports = { ZohoMailProvider };
