"use strict";
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload')

const express = require('express')
const session = require('express-session')

const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const saltRounds = 10

const db = require('./database.js')
const mail = require('./mail.js')

const schedule = require('node-schedule')

const app = express()

let login_success = true

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))
app.use(fileUpload())

const sessionParser = session({
    secret: "TODO: move this out to environment var",
    resave: false,
    saveUninitialized: false
})

app.use(sessionParser)

app.use(passport.initialize())
app.use(passport.session())

passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    },

    async function (email, password, done) {
        try {
            const users = await db.getAllUsersForEmail(email)

            if (users.length < 1) {
                return done(null, false, {message: 'Invalid email.'})
            }

            const passwordsMatch = await bcrypt.compare(password, users[0].password_hash)
            if (!passwordsMatch) {
                return done(null, false, {message: 'Invalid password.'})
            }

            return done(null, users[0])
        } catch (e) {
            return done(e.stack)
        }
    }
))

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
    try {
        const user = await db.getUserForId(id)
        return done(null, user)
    } catch (e) {
        return done(e.stack)
    }
})

function chop_date(date) {
    return date.toString().substring(0, date.toString().length-15)
}

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login')
}


// function finalDecisionDate(date, days) {
//     let copy = new Date(date.getTime())
//     copy.setDate(date.getDate() - days)
//     return copy
// }

function sendReminderEmails() {

}

app.get('/', (req, res) => {
    return res.redirect('/login')
});

app.get('/login', (req, res) => {
    if (login_success) {
        res.render('Login', {message: null});
    } else {
        res.render('Login', {message: 'loginfail'});
        login_success = true
    }
});

app.post('/login', passport.authenticate('local',
    {successRedirect: '/groupchat', failureRedirect: '/loginfail'})
)

app.get('/loginfail', (req, res) => {
    login_success = false
    return res.redirect('/login')
})

app.post('/logout', (req, res) => {
    req.logout()
    return res.send({redirect: '/'})
})

app.post('/register', async (req, res) => {
    try {
        const pwhash = await bcrypt.hash(req.body.password, saltRounds)
        const status = await db.createUser(req.body.forename, req.body.surname,
            req.body.gender, req.body.email, req.body.mobile, pwhash)
        if (status.rowCount == 0) {
            res.send({status: 'fail'})
        } else res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
    }
})

app.get('/currentuser', ensureAuthenticated, (req, res) => {
    res.send('You are currently logged in as: ' + req.user.forename + ' ' + req.user.surname)
})

app.get('/groupchat', ensureAuthenticated, async (req, res) => {
    let teams
    let update_info
    try {
        teams = await db.getTeamsForUserId(req.user.id)
        update_info = await db.getUpdateInfoForUserID(req.user.id)
        teams.reverse()
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
    if (teams.length == 0) {
        res.redirect('/main');
    } else {
        res.render('GroupChatPage', {teams: teams, update:update_info,});
    }
})

app.get('/main', ensureAuthenticated, (req, res) => {
    res.render('MainPage', {forename: req.user.forename})
})

app.get('/createTeam', ensureAuthenticated, (req, res) => {
    res.render('CreateTeam');
})

app.post('/createTeam', ensureAuthenticated, async (req, res) => {
    let teamid
    try {
        teamid = await db.createTeam(req.body.name, req.body.type,
            req.body.description)
        await db.addUserToTeamWithAccessLevel(req.user.id, teamid, 'admin')
        return res.send('{ "redirect": "/groupchat" }')
    } catch (e) {
        res.status(500).send(e.stack)
    }
})

app.get('/Teams', ensureAuthenticated, async (req, res) => {

    let teamsc
    let teams
    let update_info
    try {
        update_info = await db.getUpdateInfoForUserID(req.user.id)
        const allteams = await db.getTeamsForUserIDWithAccessLevel(req.user.id)
        teamsc = allteams.filter((team) => team.access_level != 'user')
        teams = allteams.filter((team) => team.access_level == 'user')
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
    res.render('TeamsPage', {teamsc: teamsc, teams: teams, update: update_info})

});

app.post('/joinTeam', ensureAuthenticated, async (req, res) => {
    try {
        let success = await db.joinTeamWithJoinCodeForUserId(req.body.code, req.user.id)

        if (success) {
            if (success.code == '23505') {
                res.json({msg: 'Duplicate'})
            } else {
                res.json({msg: 'Success', redirect: '/groupchat'})
            }
        } else {
            res.json({msg: 'Failed'})
        }
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.post('/generateCode', ensureAuthenticated, async (req, res) => {
    try {
        await db.createJoinCodeForTeamId(req.body.codeGen, req.body.teamId)
        return res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.get('/Photos', ensureAuthenticated, async (req, res) => {
    let allEvents
    let teams
    let photos
    let update_info
    try {
        update_info = await db.getUpdateInfoForUserID(req.user.id)
        allEvents = await db.getAllEventsForUserId(req.user.id)
        teams = await db.getTeamsForUserId(req.user.id)
        photos = []
        for (let i = 0; i < allEvents.length; i++) {
            photos[i] = await db.getPhotoIdsForEventId(allEvents[i].id)
        }
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }

    res.render('PhotosPage', {chop_date: chop_date, events: allEvents, teams: teams, photos: photos, active_id: 0, update:update_info})
})

app.get('/Photos/:teamid', ensureAuthenticated, async (req, res) => {
    let allEvents
    let teams
    let photos
    let update_info
    try {
        update_info = await db.getUpdateInfoForUserID(req.user.id)
        allEvents = await db.getEventsForTeamId(req.params.teamid)
        teams = await db.getTeamsForUserId(req.user.id)
        photos = []
        for (let i = 0; i < allEvents.length; i++) {
            photos[i] = await db.getPhotoIdsForEventId(allEvents[i].id)
        }
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
    res.render('PhotosPage', {chop_date: chop_date, events: allEvents, teams: teams, photos: photos, active_id: req.params.teamid, update:update_info})
})

app.post('/Photos/Upload/:eventid', ensureAuthenticated, async (req, res) => {
    if (!req.files.photo) {
        return res.redirect("/Photos")
    }

    if (!(['image/jpeg', 'image/png', 'image/webp'].includes(req.files.photo.mimetype))) {
        return res.redirect("/Photos")
    }

    let update_info
    await db.createPhoto(req.files.photo.data, req.files.photo.mimetype, req.params.eventid)

    return res.redirect("/Photos")
})

app.post('/ViewAll/Upload/:eventid', ensureAuthenticated, async (req, res) => {
    if (!req.files.photo) {
        return res.redirect("/ViewAll/" + req.params.eventid)
    }

    if (!(['image/jpeg', 'image/png', 'image/webp'].includes(req.files.photo.mimetype))) {
        return res.redirect("/ViewAll/" + req.params.eventid)
    }

    await db.createPhoto(req.files.photo.data, req.files.photo.mimetype, req.params.eventid)

    return res.redirect("/ViewAll/" + req.params.eventid)
})

app.get('/Photos/view/:id', ensureAuthenticated, async (req, res) => {
    const photo = await db.getPhotoForId(req.params.id)

    res.writeHead(200, {
        'Content-Type': photo.mime,
        'Content-Length': photo.photo.length
    });

    res.end(photo.photo)
})

app.get('/ViewAll/:eventid', ensureAuthenticated, async (req, res) => {
    let event = await db.getEventForEventId(req.params.eventid)
    let photos = await db.getPhotoIdsForEventId(req.params.eventid)
    res.render('ViewAllPhotos', {photos: photos, event: event});
})

app.get('/Events', ensureAuthenticated, async (req, res) => {
    let render_events
    let eventsprevious
    let eventsupcoming
    let teams
    let update_info
    try {
        const events = await db.getAllEventsForUserIdWithAccessLevelAndStatus(req.user.id)
        update_info = await db.getUpdateInfoForUserID(req.user.id)
        render_events = events.map(ev => {
            return {
                'id': ev.id,
                'name': ev.name,
                'date': ev.timestamp,
                'duration': ev.duration,
                'location': ev.location,
                'status': ev.status,
                'access_level': ev.access_level,
                'finalDecisionDate': ev.final_decision_date,
                'event_status': ev.event_status,
            }
        })
        const now = new Date()
        eventsprevious = render_events.filter((ev) => new Date(ev.date) < now)
        eventsupcoming = render_events.filter((ev) => new Date(ev.date) >= now)
        teams = await db.getTeamsForUserId(req.user.id)
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }

    res.render('EventsPage', {
        eventsprevious: eventsprevious,
        eventsupcoming: eventsupcoming,
        teams: teams,
        access_level: 'user',
        active_id: 0,
        update: update_info,
        current_team_name: null
    });
});


app.get('/Events/:teamid', ensureAuthenticated, async (req, res) => {
    let eventsprevious
    let eventsupcoming
    let teams
    let access_level
    let render_events
    let current_team
    let update_info
    try {
        update_info = await db.getUpdateInfoForUserID(req.user.id)
        const events = await db.getAllEventsForTeamIdWithAccessLevelAndStatus(req.params.teamid, req.user.id)
        render_events = events.map(ev => {
            return {
                'id': ev.id,
                'name': ev.name,
                'date': ev.timestamp,
                'duration': ev.duration,
                'location': ev.location,
                'status': ev.status,
                'access_level': ev.access_level,
                'finalDecisionDate': ev.final_decision_date,
                'event_status': ev.event_status,
            }
        })
        const now = new Date()
        eventsprevious = render_events.filter((ev) => new Date(ev.date) < now)
        eventsupcoming = render_events.filter((ev) => new Date(ev.date) >= now)
        teams = await db.getTeamsForUserId(req.user.id)
        access_level = await db.getAccessLevelForUserIDAndTeamID(req.user.id, req.params.teamid)
        current_team = await db.getTeamForId(req.params.teamid)
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
    res.render('EventsPage', {
        eventsprevious: eventsprevious,
        eventsupcoming: eventsupcoming,
        teams: teams,
        access_level: access_level,
        active_id: req.params.teamid,
        current_team_name: current_team.name,
        update: update_info,
    })
});

app.post('/addEvent', ensureAuthenticated, async (req, res) => {
    try {
        const event = await db.createEvent(req.user.id, req.body.teamid, req.body.eventname,
            req.body.starttime, req.body.duration, req.body.location, req.body.finalDecisionDate)
        mail.sendNewEventEmail(event)
        return res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }

})

app.get('/ViewDetails/:event_id', ensureAuthenticated, async (req, res) => {
    let event
    let access_level
    let accepted_list
    let declined_list
    let noreply_list
    let accepted_list_avatars = []
    let declined_list_avatars = []
    let noreply_list_avatars  = []
    try {
        event = await db.getEventForEventIDWithStatus(req.params.event_id, req.user.id)
        await db.changeEventStatusForUserID(req.user.id, req.params.event_id, 'stable')
        access_level = await db.getAccessLevelForUserIDAndTeamID(req.user.id, event.team_id)
        accepted_list = await db.getAllUsersFromEventsWithStatus(event.id, 'confirmed')
        declined_list = await db.getAllUsersFromEventsWithStatus(event.id, 'rejected')
        noreply_list = await db.getAllUsersFromEventsWithStatus(event.id, 'noreply')
        for (let i = 0; i < accepted_list.length; i++) {
            accepted_list_avatars[i] = await db.getAvatarIdForUserId(accepted_list[i].id)

        }
        for (let i = 0; i < declined_list.length; i++) {
            declined_list_avatars[i] = await db.getAvatarIdForUserId(declined_list[i].id)
        }
        for (let i = 0; i < noreply_list.length; i++) {
            noreply_list_avatars[i] = await db.getAvatarIdForUserId(noreply_list[i].id)
        }
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
    res.render('ViewDetails',
        {
            event: event,
            access_level: access_level,
            acceptedList: accepted_list,
            rejectList: declined_list,
            noreplyList: noreply_list,
            accepted_list_avatars: accepted_list_avatars,
            declined_list_avatars: declined_list_avatars,
            noreply_list_avatars: noreply_list_avatars
        })
})

app.post('/changeStatus', ensureAuthenticated, async (req, res) => {
    try {
        await db.changeStatusForUserID(req.user.id, req.body.event_id, req.body.status)
        await db.changeEventStatusForUserID(req.user.id, req.body.event_id, 'stable')
        res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.get('/TeamDetails/:team_id', ensureAuthenticated, async (req, res) => {
    let team
    let join_code_info
    let all_members
    let creator
    let access_level
    let expire_period
    let avatars = []
    try {
        team = await db.getTeamForId(req.params.team_id)
        join_code_info = await db.getCurrentJoinCodeForTeamID(req.params.team_id);
        all_members = await db.getAllUsersInfoForTeam(req.params.team_id)
        creator = await db.getCreatorForTeamID(req.params.team_id)
        access_level = await db.getAccessLevelForUserIDAndTeamID(req.user.id, req.params.team_id)
        if (access_level === undefined) {
            return res.send("You have been kicked out of this team.")
        }
        if (join_code_info === undefined) {

            expire_period = 'No code generated yet.'
        } else {
            expire_period = Math.ceil((join_code_info.expires - new Date()) / (1000 * 3600 * 24))
        }
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
    all_members.sort(function (a, b) {
        if (a.access_level == 'admin') return -1
        if (a.access_level == 'manager') {
            if (b.access_level == 'manager') {
                return a.forename - b.forename
            } else if (b.access_level == 'admin') {
                return 1
            } else {
                return -1
            }
        }
        if (b.access_level != 'user') {
            return 1
        } else {
            return a.forename - b.forename
        }
    })
    for (let i=0; i<all_members.length;i++){
        avatars[i] = await db.getAvatarIdForUserId(all_members[i].id)
    }
    res.render('TeamDetails',
        {
            team: team,
            join_code_info: join_code_info,
            team_members: all_members,
            creator: creator,
            access_level: access_level,
            expire_period: expire_period,
            avatars: avatars,
        })
})

app.post('/updateDetails', ensureAuthenticated, async (req, res) => {
    try {
        await db.changeEventStatusForAllTeamMembers(req.body.event_id, 'changed')
        await db.changeEventDetailsForUserID(req.body.event_id, req.body.name,
            req.body.location, req.body.date, req.body.duration, req.body.finalDecisionDate)

        const event = await db.getEventForEventId(req.body.event_id)
        mail.sendEventUpdatedEmail(event)

        return res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.post('/deleteEvent', ensureAuthenticated, async (req, res) => {
    let event
    try {
        event = await db.getEventForEventId(req.body.event_id)
        await db.deleteEventForEventID(req.body.event_id)
        mail.sendEventDeletedEmail(event)
        return res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.get('/Settings', ensureAuthenticated, async(req, res) => {
    let avatar = await db.getAvatarIdForUserId(req.user.id)
    let update_info = await db.getUpdateInfoForUserID(req.user.id)
    res.render('SettingsPage',
        {
            user: req.user,
            avatar: avatar,
            update: update_info,
        })
});

app.post('/updatePersonalDetails', ensureAuthenticated, async (req, res) => {
    try {
        await db.changeMobileForUserID(req.user.id, req.body.mobile)
        res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.post('/updateTeamDetails', ensureAuthenticated, async (req, res) => {
    try {
        await db.changeTeamDetailsForTeamID(req.body.team_id, req.body.name, req.body.description)
        return res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.post('/setTeamManager', ensureAuthenticated, async (req, res) => {
    try {
        await db.changeAccessLevelForUserID(req.body.member_id, req.body.team_id, 'manager')
        return res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.post('/unsetTeamManager', ensureAuthenticated, async (req, res) => {
    try {
        await db.changeAccessLevelForUserID(req.body.member_id, req.body.team_id, 'user')
        return res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.post('/removeMember', ensureAuthenticated, async (req, res) => {
    try {
        await db.removeMemberForUserIDAndTeamID(req.body.member_id, req.body.team_id)
        return res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.post('/leaveTeam', ensureAuthenticated, async (req, res) => {
    try {
        await db.removeMemberForUserIDAndTeamID(req.user.id, req.body.team_id)
        return res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.post('/dismissTeam', ensureAuthenticated, async (req, res) => {
    try {
        await db.dismissTeamForTeamID(req.body.team_id)
        return res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.post('/uploadAvatar', ensureAuthenticated, async (req, res) => {
    if (!req.files.avatar) {
        return res.redirect("/Settings")
    }

    if (!(['image/jpeg', 'image/png', 'image/webp'].includes(req.files.avatar.mimetype))) {
        return res.redirect("/Settings")
    }

    await db.uploadAvatar(req.files.avatar.data, req.files.avatar.mimetype, req.user.id)

    return res.redirect("/Settings")
})

app.get('/Avatars/view/:id', ensureAuthenticated, async (req, res) => {
    const avatar = await db.getAvatarForId(req.params.id)

    res.writeHead(200, {
        'Content-Type': avatar.mime,
        'Content-Length': avatar.photo.length
    });

    res.end(avatar.photo)
})

app.post('/deletePhoto', ensureAuthenticated, async (req, res) => {
    try {
        await db.deletePhotoForPhotoID(req.body.photo_id)
        return res.send({status: 'success'})
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

module.exports = {
    app: app,
    sessionParser: sessionParser
}
