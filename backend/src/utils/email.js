import nodemailer from 'nodemailer';

export default class Email {
    constructor(user, url) {
        this.to = user.email;
        this.firstName = user.user_name;
        this.url = url;
        this.from = `Chatbot Support <${process.env.EMAIL_FROM || 'admin@example.com'}>`;
    }

    getSmtpConfig() {
        const host = (process.env.EMAIL_HOST || '').trim();
        const rawPort = (process.env.EMAIL_PORT || '').trim();
        const user = (process.env.EMAIL_USERNAME || '').trim();
        const pass = (process.env.EMAIL_PASSWORD || '').trim();
        const port = Number(rawPort);

        const missing = [];
        if (!host) missing.push('EMAIL_HOST');
        if (!rawPort || Number.isNaN(port)) missing.push('EMAIL_PORT');
        if (!user) missing.push('EMAIL_USERNAME');
        if (!pass) missing.push('EMAIL_PASSWORD');

        if (missing.length > 0) {
            throw new Error(`Mail transport config missing: ${missing.join(', ')}`);
        }

        return {
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass
            }
        };
    }

    // 転送設定
    newTransport() {
        const env = (process.env.NODE_ENV || '').toLowerCase();
        const isProdLike = env === 'production' || env === 'product';

        if (isProdLike) {
            const sendgridApiKey = (process.env.SENDGRID_API_KEY || '').trim();
            const sendgridUsername = (process.env.SENDGRID_USERNAME || 'apikey').trim();
            const sendgridPassword = (process.env.SENDGRID_PASSWORD || '').trim();

            if (sendgridApiKey) {
                return nodemailer.createTransport({
                    service: 'SendGrid',
                    auth: {
                        user: 'apikey',
                        pass: sendgridApiKey
                    }
                });
            }

            if (sendgridUsername && sendgridPassword) {
                return nodemailer.createTransport({
                    service: 'SendGrid',
                    auth: {
                        user: sendgridUsername,
                        pass: sendgridPassword
                    }
                });
            }
        }

        // 開発環境、および本番環境で SendGrid 未設定時のフォールバック
        return nodemailer.createTransport(this.getSmtpConfig());
    }

    // 送信メソッド
    async send(subject, message) {
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            text: message
        };
        // 送信
        const transporter = this.newTransport();
        const info = await transporter.sendMail(mailOptions);
        const env = (process.env.NODE_ENV || '').toLowerCase();
        if (env !== 'production' && env !== 'product') {
            console.log('✉ Mail Sent! Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
    }
    // パスワードリセットメールの送信
    async sendPasswordReset() {
        const message = `
        ${this.firstName} 様

        パスワードリセットのリクエストを受け付けました。
        以下のリンクをクリックして新しいパスワードを設定してください。
        (有効期限: 10分間)

        ${this.url}

        もしこのメールに心当たりがない場合は、管理者へご連絡ください。
        `;

        await this.send('【重要】 パスワードリセットのお知らせ', message.trim());
    }
}