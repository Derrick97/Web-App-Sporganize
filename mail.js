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
    sendMailToEmail: function (email_addr, subject, body) {
        transporter.sendMail({
            from: 'noreply@sporganize',
            to: email_addr,
            subject: subject,
            text: body
        });
    },

    sendReminderEmails: async function (event) {
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

    sendNewEventEmail: async function (event) {
        const users = await db.getAllUsersInfoForTeam(event.team_id)
        const team = await db.getTeamForId(event.team_id)

        for (let i = 0; i < users.length; i++) {
            const user = users[i]

            const email_addr = user.email
            const subject = 'New Event: ' + event.name

            //    console.log("event.duration: %j", event.duration)

            const body = [
                'Dear ' + user.forename,
                '',
                'You have a new event for ' + team.name + ':',
                'Event: ' + event.name,
                'Start time: ' + event.timestamp,
                'Last date for making decisions:' + event.final_decision_date,
                'Duration: ' + durationToString(event.duration),
                'Location: ' + event.location
            ].join('\n')

            this.sendMailToEmail(email_addr, subject, body)
        }
    },

    sendEventUpdatedEmail: async function (event) {
        const users = await db.getAllUsersInfoForTeam(event.team_id)
        const team = await db.getTeamForId(event.team_id)

        for (let i = 0; i < users.length; i++) {
            const user = users[i]

            const email_addr = user.email
            const subject = 'Event Update: ' + event.name

            const body = [
                'Dear ' + user.forename,
                '',
                'An event for ' + team.name + ' team has changed. The new details are:',
                'Event name: ' + event.name,
                'Start time: ' + event.timestamp,
                'Last date for making decisions:' + event.final_decision_date,
                'Duration: ' + durationToString(event.duration),
                'Location: ' + event.location
            ].join('\n')

            this.sendMailToEmail(email_addr, subject, body)
        }
    },

    sendEventDeletedEmail: async function (event) {
        const users = await db.getAllUsersInfoForTeam(event.team_id)
        const team = await db.getTeamForId(event.team_id)

        for (let i = 0; i < users.length; i++) {
            const user = users[i]

            const email_addr = user.email
            const subject = 'Event Update: ' + event.name

            const body = [
                'Dear ' + user.forename,
                '',
                'The following event for ' + team.name + ' team has been deleted.',
                'Event name: ' + event.name,
                'Start time: ' + event.timestamp,
                'Last date for making decisions:' + event.final_decision_date,
                'Duration: ' + durationToString(event.duration),
                'Location: ' + event.location
            ].join('\n')

            this.sendMailToEmail(email_addr, subject, body)
        }
    },

    sendRemoveMemberEmail: async function (member_id, team_id) {
        const user = await db.getUserForId(member_id)
        const team = await db.getTeamForId(team_id)

        const email_addr = user.email
        const subject = 'System Notification: ' + team.name + ' team'
        const body = [
            'Dear ' + user.forename,
            '',
            'You have been removed from ' + team.name + ' team.',
            'Team name: ' + team.name,
            'Team type: ' + team.type,
            'Good Luck!'
        ].join('\n')

        this.sendMailToEmail(email_addr, subject, body)

    },

    sendLeaveTeamEmail: async function (member_id, team_id) {
        const member = await db.getUserForId(member_id)
        const team = await db.getTeamForId(team_id)
        const managers = await db.getAllManagersForTeamId(team_id)

        for (let i = 0; i < managers.length; i++) {
            const user = await db.getUserForId(managers[i].user_id)
            const email_addr = user.email
            const subject = 'System Notification: ' + team.name + ' team'
            const body = [
                'Dear ' + user.forename,
                '',
                'A member has just leave ' + team.name + ' team.',
                'Forename: ' + member.forename,
                'Surname: ' + member.surname,
                'Email Address: ' + member.email,
            ].join('\n')

            this.sendMailToEmail(email_addr, subject, body)
        }
    },

    sendDismissTeamEmail: async function (members, team) {
        for (let i = 0; i < members.length; i++) {
            const user = await db.getUserForId(members[i].id)
            const email_addr = user.email
            const subject = 'System Notification: ' + team.name + ' team'
            const body = [
                'Dear ' + user.forename,
                '',
                team.name + ' team has just been dismissed.',
                'Team name: ' + team.name,
                'Team type: ' + team.type,
            ].join('\n')

            this.sendMailToEmail(email_addr, subject, body)
        }
    }
}
