"use strict";
const express = require('express')
const app = express()

const { Pool } = require('pg')
const pool = new Pool()

console.log(process.env)

const expressWs = require('express-ws')(app);

const login_info = [
    {
        id: 1,
        email: 'jr2216@ic.ac.uk',
        pwd: '1234567',
        eventsID: [1,2,3],
        groupID: [21,22,23],
    },
    {
        id: 2,
        email: 'cz1616@ic.ac.uk',
        pwd: 'zhangchi',
        eventsID: [2,3],
        groupID: [16,17],
    }
];

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
    }
]

const eventsempty = [
]

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

app.set('view engine', 'ejs');

let bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.get('/', (req, res) => {
    res.render('Login')
});

app.get('/Login', (req, res) => {
    res.render('Login');
});

app.post('/login/:email', (req, res) => {
    const info = login_info.filter((login) => {
        return login.email == req.body.email;
    })[0]
    if (info.pwd == req.body.pwd) {
        if(info.eventsID.length>0){
            //Not all events, should be queried from DB.
            res.render('EventsPage', {events: events,emailAdd:info.email});
        } else {
            res.render('MainPage');
        }
    } else {
        res.render('LoginFailPage');
    }
});

app.get('/GroupChat/:email/:teamID', (req, res) => {
    res.render('GroupChatPage',
        {
            groupID: req.params.teamID,
            groupName: "Some Name Queried From DB.",
            emailAdd: req.params.email,
        });
});

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
        console.log(db_events)
    } catch(e) {
        res.status(500).send(e.stack)
        return
    }

    res.render('EventsPage', {events: db_events, emailAdd:req.params.email,});
});

app.get('/Events/:email/:teamname', (req, res) => {
    if (req.params.teamname == 'TeamA') {
        res.render('EventsPage', {events: events1, emailAdd:req.params.email,});
    } else  if (req.params.teamname == 'TeamB') {
        res.render('EventsPage', {events: events2, emailAdd:req.params.email,});
    } else  if (req.params.teamname == 'TeamC') {
        res.render('EventsPage', {events: events3, emailAdd:req.params.email,});
    }
});

app.get('/Photos/:email', (req, res) => {
    res.render('PhotosPage',{emailAdd:req.params.email});
});

app.get('/Teams/:email', (req, res) => {
    const user = login_info.filter((user)=> {
        return user.email == req.params.email;
    })[0];
    const groupID = user.groupID;

    res.render('TeamsPage', {events: {}, emailAdd:req.params.email,groupID:groupID});
});

app.post('/Teams/:email', (req, res) => {
    const user = login_info.filter((user)=> {
        return user.email == req.params.email;
    })[0];
    const groupID = user.groupID;
    res.render('TeamsPage',
        {
            groupID:groupID,
            events:events,
            teamName:req.body.teamname,
            teamType:req.body.teamtype,
        })
})

app.get('/Settings/:email', (req, res) => {
    res.render('SettingsPage',{emailAdd: req.params.email});
});

app.get('/CreateTeam', (req, res) => {
    res.render('CreateTeam');
})

app.get('/ChangeStatus/:id',(req,res) =>{
    const event = events.filter((event)=> {
        return event.id == req.params.id;
    })[0]
    res.render('ChangeStatus',{
        eventID: event.id,
        eventName: event.name,
        eventStatus: event.status,
        eventDay: event.day,
        eventLocation: event.location,
        eventDate: event.date,
    })
});

app.get('/GroupChatList/:email',(req, res) =>{
    const user = login_info.filter((user)=> {
        return user.email == req.params.email;
    })[0];
    const groupID = user.groupID;
    res.render('GroupChatList',{emailAdd:req.params.email, groupID: groupID});
})

// app.get('/:name', (req, res) => {
//     res.render('Login', { name: req.params.name })
// })

app.listen(8080, () => {
    console.log("Running on port 8080")
})
