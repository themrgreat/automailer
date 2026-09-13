const nodemailer = require("nodemailer");

class GmailProvider {
  constructor(opts) {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: opts.user,
        clientId: opts.clientId,
        clientSecret: opts.clientSecret,
        refreshToken: opts.refreshToken,
      },
    });
    this.fromAddress = opts.fromName ? `"${opts.fromName}" <${opts.user}>` : opts.user;
  }

  // Cheap connectivity/credentials check — opens and authenticates the SMTP connection
  // without sending anything.
  static async testConnection(values) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: values.user,
        clientId: values.clientId,
        clientSecret: values.clientSecret,
        refreshToken: values.refreshToken,
      },
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

module.exports = { GmailProvider };
