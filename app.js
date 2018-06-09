"use strict";
const bodyParser = require('body-parser')
const express = require('express')
const session = require('express-session')

const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const saltRounds = 10

const db = require('./database.js')

const app = express()

let login_success = true

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))

app.use(session({
    secret: "TODO: move this out to environment var",
    resave: false,
    saveUninitialized: false
}))

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

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login')
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
    res.redirect('/')
})

app.post('/register', async (req, res) => {
    try {
        const pwhash = await bcrypt.hash(req.body.password, saltRounds)
        await db.createUser(req.body.forename, req.body.surname,
            req.body.gender, req.body.email, req.body.mobile, pwhash)
        res.redirect('/login')
    } catch (e) {
        res.status(500).send(e.stack)
    }
})

app.get('/currentuser', ensureAuthenticated, (req, res) => {
    res.send('You are currently logged in as: ' + req.user.forename + ' ' + req.user.surname)
})

app.get('/groupchat', ensureAuthenticated, async (req, res) => {
    let teams
    try {
        teams = await db.getTeamsForUserId(req.user.id)
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
    if (teams.length == 0) {
        res.redirect('/main');
    } else {
        res.render('GroupChatPage', {teams: teams});
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
        return res.redirect('/groupchat')
    } catch (e) {
        res.status(500).send(e.stack)
    }
})

app.get('/Teams', ensureAuthenticated, async (req, res) => {

    let teamsc
    let teams
    try {
        const allteams = await db.getTeamsForUserIDWithAccessLevel(req.user.id)
        teamsc = allteams.filter((team) => team.access_level != 'user')
        teams = allteams.filter((team) => team.access_level == 'user')
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
    res.render('TeamsPage', {teamsc: teamsc, teams: teams})

});

app.post('/joinTeam', ensureAuthenticated, async (req, res) => {
    try {
        await db.joinTeamWithJoinCodeForUserId(req.body.code, req.user.id)
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.post('/generateCode', ensureAuthenticated, async (req, res) => {
    try {
        await db.createJoinCodeForTeamId(req.body.codeGen, req.body.teamId)
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.get('/Photos', ensureAuthenticated, async (req, res) => {
    let allEvents
    let teams
    try {
        allEvents = await db.getAllEventsForUserId(req.user.id)
        teams = await db.getTeamsForUserId(req.user.id)
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
    res.render('PhotosPage', {events: allEvents, teams: teams})
})

app.get('/Events', ensureAuthenticated, async (req, res) => {
    let render_events
    let eventsprevious
    let eventsupcoming
    let teams
    try {
        const events = await db.getAllEventsForUserIdWithAccessLevel(req.user.id)
        render_events = events.map(ev => {
            return {
                'id': ev.id,
                'name': ev.name,
                'date': ev.timestamp,
                'location': ev.location,
                'status': '',
                'access_level': ev.access_level,
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

    res.render('EventsPage', {eventsprevious: eventsprevious, eventsupcoming: eventsupcoming, teams: teams, access_level: 'user', active_id: 0, current_team_name: null});
});


app.get('/Events/:teamid', ensureAuthenticated, async (req, res) => {
    let eventsprevious
    let eventsupcoming
    let teams
    let access_level
    let render_events
    let current_team
    try {
        const events = await db.getAllEventsForTeamIdWithAccessLevel(req.params.teamid, req.user.id)
        render_events = events.map(ev => {
            return {
                'id': ev.id,
                'name': ev.name,
                'date': ev.timestamp,
                'location': ev.location,
                'status': '',
                'access_level': ev.access_level,
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
    res.render('EventsPage', {eventsprevious: eventsprevious, eventsupcoming: eventsupcoming, teams:teams, access_level: access_level, active_id: req.params.teamid, current_team_name: current_team.name})
});

app.post('/addEvent', ensureAuthenticated, async (req, res) => {
    try {
        await db.createEvent(req.body.teamid, req.body.eventname, req.body.starttime, req.body.duration, req.body.location)
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
})

app.get('/ViewDetails/:eventid', ensureAuthenticated, async (req, res) => {
    let event
    let access_level
    try {
        event = await db.getEventForEventId(req.params.eventid)
        access_level = await db.getAccessLevelForUserIDAndTeamID(req.user.id, event.teamid)
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }
    res.render('ViewDetails', {event: event, access_level: access_level})
    })























app.get('/Photos/:email', ensureAuthenticated, (req, res) => {
    //Mock database query.
    const user = queryUser(req.params.email);
    let eventsID = [];
    for (let i = 0; i < user.groupID.length; i++) {
        const group = groups.filter((group) => {
            return group.id == user.groupID[i];
        })[0];
        eventsID.concat(group.eventsID);
    }
    let allEvents = [];
    for (let i = 0; i < eventsID.length; i++) {
        const event = events.filter((event) => {
            return event.id == eventsID[i];
        })[0];
        allEvents.push(event);
    }

    res.render('PhotosPage',
        {
            groupsID: user.groupID,
            emailAdd: req.params.email,
            events: [events[0], events[1], events[2]],
            activeID: -1,
        });
});

app.get('/Photos/:email/:groupID', ensureAuthenticated, (req, res) => {
    const user = queryUser(req.params.email);
    const group = groups.filter((group) => {
        return group.id == req.params.groupID;
    });
    //...Some query...
    res.render('PhotosPage',
        {
            groupsID: user.groupID,
            emailAdd: req.params.email,
            events: [events[0]],
            activeID: req.params.eventID,
        });
});


app.post('/Teams/:email', ensureAuthenticated, (req, res) => {
    const user = login_info.filter((user) => {
        return user.email == req.params.email;
    })[0];
    const createGroupID = [];
    const joinGroupID = [22, 23];
    //The two attribute above should be queried from database.
    //In post method, the teamname and team type in req.body should be sent to database first, and then queried
    // from database to get the latest info of all teams.
    res.render('TeamsPage',
        {
            createGroupID: createGroupID,
            joinGroupID: joinGroupID,
            emailAdd: req.params.email,
            events: events,
            teamName: req.body.teamname,
            teamType: req.body.teamtype,
        })
})

app.get('/Settings', ensureAuthenticated, (req, res) => {
    res.render('SettingsPage', {emailAdd: req.user.email});
});


app.get('/Upload/:email/:eventID', ensureAuthenticated, (req, res) => {
    res.render('UploadPhotos', {
        emailAdd: req.params.email,
        eventID: req.params.eventID,
    })
});

module.exports = app;
