"use strict";
const express = require('express')
const app = express()

const {Pool} = require('pg')
const pool = new Pool()

const login_info = [
    {
        id: 1,
        email: 'jr2216@ic.ac.uk',
        pwd: '1234567',
        eventsID: [1, 2, 3],
        groupID: [21, 22, 23],
    },
    {
        id: 2,
        email: 'cz1616@ic.ac.uk',
        pwd: 'zhangchi',
        eventsID: [2, 3],
        groupID: [16, 17],
    }
];

const accessControl = [
    {
        id: 1,
        groupID: 21,
        accessLevel: 1,
    },
    {
        id: 1,
        groupID: 22,
        accessLevel: 2,
    },
    {
        id: 1,
        groupID: 23,
        accessLevel: 2,
    }
]

const events = [
    {
        id: 1,
        name: 'match VS UCL',
        day: 'Wednesday',
        date: '23rd May 2:00pm',
        location: 'UCL Sports Ground',
        status: 'You Attended'
    },
    {
        id: 2,
        name: 'match VS LSE',
        day: 'Thursday',
        date: '24rd May 4:00pm',
        location: 'Imperial Sports Ground',
        status: 'You Declined'
    },
    {
        id: 3,
        name: 'Training',
        day: 'Friday',
        date: '25rd May 10:00am',
        location: 'Imperial Sports Ground',
        status: 'Unknown'
    },
    {
        id: 4,
        name: 'After Exam fun!',
        day: 'Monday',
        date: '28nd May 9:00am',
        location: 'Lee Abbey Sportsfield',
        status: 'You Attended'
    },
    {
        id: 5,
        name: 'Leisure Football',
        day: 'Monday',
        date: '14nd June 9:00pm',
        location: 'KCL Gym',
        status: 'You Declined'
    }
]

const eventsprevious = [
    {
        id: 1,
        name: 'match VS UCL',
        day: 'Wednesday',
        date: '23rd May 2:00pm',
        location: 'UCL Sports Ground',
        status: 'You Attended'
    },
    {
        id: 2,
        name: 'match VS LSE',
        day: 'Thursday',
        date: '24rd May 4:00pm',
        location: 'Imperial Sports Ground',
        status: 'You Declined'
    }
]

const eventsupcoming = [
    {
        id: 3,
        name: 'Training',
        day: 'Friday',
        date: '25rd May 10:00am',
        location: 'Imperial Sports Ground',
        status: 'Unknown'
    }
]

const groups = [
    {
        id: 16,
        name: "IC Team",
        eventsID: [1, 2],
    },
    {
        id: 17,
        name: "LSE Sports",
        eventsID: [],
    },
    {
        id: 21,
        name: "KCL Team",
        eventsID: [3],
    },
    {
        id: 22,
        name: "LSE Sports",
        eventsID: [4, 5],
    },
    {
        id: 23,
        name: "Cambridge Sports",
        eventsID: [],
    }
]

const eventsempty = []

const events1 = [
    {
        id: 1,
        name: 'match VS UCL',
        day: 'Wednesday',
        date: '23rd May 2:00pm',
        location: 'UCL Sports Ground',
        status: 'You Attended'
    }
]

const events2 = [
    {
        id: 2,
        name: 'match VS LSE',
        day: 'Thursday',
        date: '24rd May 4:00pm',
        location: 'Imperial Sports Ground',
        status: 'You Declined'
    }
]

const events3 = [
    {
        id: 3,
        name: 'Training',
        day: 'Friday',
        date: '25rd May 10:00am',
        location: 'Imperial Sports Ground',
        status: 'Unknown'
    }
]

function queryUser(email) {
    const user_info = login_info.filter((login) => {
        return login.email == email;
    })[0];
    return user_info;
}


app.set('view engine', 'ejs');

let bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res) => {
    res.render('Login')
});

app.get('/Login', (req, res) => {
    res.render('Login');
});

app.post('/login/:email', (req, res) => {
    const info = queryUser(req.params.email);
    if (info.pwd == req.body.pwd) {
        if (info.eventsID.length > 0) {
            //Not all events, should be queried from DB.
            res.render('EventsPage', {
                eventsprevious: eventsprevious,
                eventsupcoming: eventsupcoming,
                emailAdd: info.email
            });
        } else {
            res.render('MainPage');
        }
    } else {
        res.render('LoginFailPage');
    }
});


app.get('/GroupChatPage/:email/:teamID', (req, res) => {
    res.render('GroupChatPage',
        {
            groupID: [21, 22, 23],
            activeid: req.params.teamID,
            groupName: "Some Name Queried From DB.",
            emailAdd: req.params.email,
        });
});

app.get('/GroupChatPage/:email', (req, res) => {
    const user = login_info.filter((user) => {
        return user.email == req.params.email;
    })[0];
    const groupID = user.groupID;
    res.render('GroupChatPage', {emailAdd: req.params.email, groupID: groupID, activeid: groupID[0]});
})

app.get('/Events/:email', async (req, res) => {
    let db_events = {}
    try {
        const resp = await pool.query('SELECT * FROM events')
        db_events = resp.rows.map(ev => {
            return {
                'id': ev.eventid,
                'name': ev.eventname,
                'date': ev.starttime,
                'day': '',
                'location': ev.location,
                'status': ''
            }
        })
    } catch (e) {
        res.status(500).send(e.stack)
        return
    }

    res.render('EventsPage', {events: db_events, emailAdd: req.params.email,});
});


app.get('/Events/:email/:teamname', (req, res) => {
    if (req.params.teamname == 'TeamA') {
        res.render('EventsPage', {eventsprevious: events1, eventsupcoming: eventsempty, emailAdd: req.params.email,});
    } else if (req.params.teamname == 'TeamB') {
        res.render('EventsPage', {eventsprevious: events2, eventsupcoming: eventsempty, emailAdd: req.params.email,});
    } else if (req.params.teamname == 'TeamC') {
        res.render('EventsPage', {eventsprevious: eventsempty, eventsupcoming: events3, emailAdd: req.params.email,});
    }
});

app.get('/Photos/:email', (req, res) => {
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
            events: [events[0],events[1],events[2]],
            activeID: -1,
        });
});

app.get('/Photos/:email/:groupID', (req, res) => {
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

app.get('/Teams/:email', (req, res) => {
    const user = login_info.filter((user) => {
        return user.email == req.params.email;
    })[0];
    const createGroupID = [21];
    const joinGroupID = [22, 23];
    //The two attribute above should be queried from database.
    res.render('TeamsPage', {
        events: events,
        emailAdd: req.params.email,
        createGroupID: createGroupID,
        joinGroupID: joinGroupID,
    });

});

app.post('/Teams/:email', (req, res) => {
    const user = login_info.filter((user) => {
        return user.email == req.params.email;
    })[0];
    const createGroupID = [21];
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

app.get('/Settings/:email', (req, res) => {
    res.render('SettingsPage', {emailAdd: req.params.email});
});

app.get('/CreateTeam', (req, res) => {
    res.render('CreateTeam');
})

app.get('/ViewDetails/:eventID', (req, res) => {
    const event = events.filter((event) => {
        return event.id == req.params.eventID;
    })[0]
    res.render('ViewDetails', {
        eventID: event.id,
        eventName: event.name,
        eventStatus: event.status,
        eventDay: event.day,
        eventLocation: event.location,
        eventDate: event.date,
        acceptedList: ["John", "Michael","Oscar", "Derick"],
        rejectList: ["Anson","Conner","Hera"],
        noreplyList: ["Tim", "Ben", "Austin", "Jenny"],
    })
});

app.get('/Upload/:email/:eventID', (req, res) => {
    res.render('UploadPhotos', {
        emailAdd: req.params.email,
        eventID: req.params.eventID,
    })
});

module.exports = app;
