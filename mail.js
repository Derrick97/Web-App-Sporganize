const nodemailer = require('nodemailer')
const db = require('./database.js')

const transporter = nodemailer.createTransport({
    sendmail: true,
});

function durationToString(duration) {
    return (duration.days ? duration.days + "d " : "")
        + (duration.hours ? duration.hours + "h " : "")
        + (duration.minutes ? duration.minutes + "m " : "")
        + (duration.seconds ? duration.seconds + "s " : "")
}

module.exports = {
    sendMailToEmail: function(email_addr, subject, body) {
        transporter.sendMail({
            from: 'noreply@sporganize',
            to: email_addr,
            subject: subject,
            text: body
        });
    },

    sendReminderEmails: async function(event) {
        const users = await db.getAllUsersInfoForTeam(event.team_id)
        const team = await db.getTeamForId(event.team_id)

        for (let i = 0; i < users.length; i++) {
            const user = users[i]

            const email_addr = user.email
            const subject = 'Reminder: ' + event.name

            const body = [
                'Dear ' + user.forename,
                '',
                'You have an upcoming event for ' + team.name + ':',
                'Event: ' + event.name,
                'Start time: ' + event.timestamp,
                'Duration: ' + durationToString(event.duration),
                'Location: ' + event.location
            ].join('\n')

            this.sendMailToEmail(email_addr, subject, body)
        }
    },

    sendNewEventEmail: async function(event) {
        const users = await db.getAllUsersInfoForTeam(event.team_id)
        const team = await db.getTeamForId(event.team_id)

        for (let i = 0; i < users.length; i++) {
            const user = users[i]

            const email_addr = user.email
            const subject = 'New Event: ' + event.name

            console.log("event.duration: %j", event.duration)

            const body = [
                'Dear ' + user.forename,
                '',
                'You have a new event for ' + team.name + ':',
                'Event: ' + event.name,
                'Start time: ' + event.timestamp,
                'Duration: ' + durationToString(event.duration),
                'Location: ' + event.location
            ].join('\n')

            this.sendMailToEmail(email_addr, subject, body)
        }
    },

    sendEventUpdatedEmail: async function(event) {
        const users = await db.getAllUsersInfoForTeam(event.team_id)
        const team = await db.getTeamForId(event.team_id)

        for (let i = 0; i < users.length; i++) {
            const user = users[i]

            const email_addr = user.email
            const subject = 'Event Update: ' + event.name

            const body = [
                'Dear ' + user.forename,
                '',
                'An event for team ' + team.name + ' has changed. The new details are:',
                'Event name: ' + event.name,
                'Start time: ' + event.timestamp,
                'Duration: ' + durationToString(event.duration),
                'Location: ' + event.location
            ].join('\n')

            this.sendMailToEmail(email_addr, subject, body)
        }
    }
}
