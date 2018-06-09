"use strict";
const app = require('./app.js')

const { Pool } = require('pg')
const pool = new Pool()

const WebSocket = require('ws')

const port = normalizePort(process.env.PORT || '8080')
app.set('port', port)

const server = require('http').createServer(app)
const wss = new WebSocket.Server({ server })

// TODO: Move this out to another file
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

server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    const port = parseInt(val, 10)

    if (isNaN(port)) {
        // named pipe
        return val
    }

    if (port >= 0) {
        // port number
        return port
    }

    return false
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges')
            process.exit(1)
            break
        case 'EADDRINUSE':
            console.error(bind + ' is already in use')
            process.exit(1)
            break
        default:
            throw error
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}

