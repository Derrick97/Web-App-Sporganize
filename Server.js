const express = require('express')
const app = express()
const login_info = [
    {
        id: 1,
        email: 'jr2216@ic.ac.uk',
        pwd:'1234567'
    },
    {
        id: 2,
        email: 'cz1616@ic.ac.uk',
        pwd:'zhangchi'
    }
];

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('Login')
});

app.get('/Login',(req,res) => {
    res.render('Login');
})

app.post('/Login',(req, res) => {
    const info = login_info.filter((login) => {
        return login.email == req.params.email;
    });
    if(info.pwd == req.params.pwd){
        res.render('MainPage');
    } else {
        res.render('LoginFailPage');
    }
});



// app.get('/:name', (req, res) => {
//     res.render('Login', { name: req.params.name })
// })

app.listen(8080, () => { console.log("Running on port 8080") })