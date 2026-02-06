import nodemailer from 'nodemailer';

export default class Email {
    constructor(user, url) {
        this.to = user.email;
        this.firstName = user.user_name;
        this.url = url;
        this.from = `Chatbot Support <${process.env.EMAIL_FROM || 'admin@example.com'}>`;
    }
    // 転送設定
    newTransport() {
        if (process.env.NODE_ENV === 'production') {
            // 本番環境用
            return nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USERNAME,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
        }

        // 開発用
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });
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
        if (process.env.NODE_ENV !== 'production') {
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