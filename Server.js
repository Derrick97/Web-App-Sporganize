"use strict";
const app = require('./App.js')

const server = require('http').createServer(app)

const { Pool } = require('pg')
const pool = new Pool()

const WebSocket = require('ws')
const wss = new WebSocket.Server({ server })


wss.on('connection', (ws) => {
    ws.on('error', (e) => {
        console.log(e)
    })

    ws.on('message', async (data) => {
        const json = JSON.parse(data)
        const query = {
            text: 'INSERT INTO events (eventname, starttime, duration, location) \
                   VALUES ($1, $2, $3, $4)',
            values: [json.eventname, json.starttime, json.duration, json.location]
        }

        try {
            const resp = await pool.query(query)
        } catch(e) {
            console.log(e.stack)
        }
    })
})


server.listen(8080, () => {
    console.log("Running on port 8080")
})
