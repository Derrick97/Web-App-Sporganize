const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    sendmail: true,
});

module.exports = {
    sendMailToEmail: function(email_addr, subject, body) {
        transporter.sendMail({
            from: 'noreply@sporganize',
            to: email_addr,
            subject: subject,
            text: body
        });
    }
}
