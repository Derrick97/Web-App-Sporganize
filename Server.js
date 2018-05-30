const express = require('express')
const app = express()
const login_info = [
    {
        id: 1,
        email: 'jr2216@ic.ac.uk',
        pwd: '1234567'
    },
    {
        id: 2,
        email: 'cz1616@ic.ac.uk',
        pwd: 'zhangchi'
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

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('Login')
});

app.get('/Login', (req, res) => {
    res.render('Login');
})

app.post('/Login', (req, res) => {
    const info = login_info.filter((login) => {
        return login.email == req.params.email;
    });
    if (info.pwd == req.params.pwd) {
        res.render('MainPage');
    } else {
        res.render('LoginFailPage');
    }
});

app.get('/GroupChat', (req, res) => {
    res.render('GroupChatPage');
})

app.get('/Events', (req, res) => {
    res.render('EventsPage', {events: events});
});

app.get('/Photos', (req, res) => {
    res.render('PhotosPage');
});

app.get('/Teams', (req, res) => {
    res.render('TeamsPage');
});

app.get('/Settings', (req, res) => {
    res.render('SettingsPage');
});

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


// app.get('/:name', (req, res) => {
//     res.render('Login', { name: req.params.name })
// })

app.listen(8080, () => {
    console.log("Running on port 8080")
})