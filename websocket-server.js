const WebSocket = require('ws')
const util = require('util')
const db = require('./database.js')

const Validator = require('jsonschema').Validator
const validator = new Validator()
const messageSchema = {
    "title": "Message",
    "type": "object",
    "properties" : {
        "team_id": {
            "type": "integer",
        },
        "message": {
            "type": "string",
            "maxLength": 800
        }
    },
    "required": ["team_id", "message"]
}

const socketsForTeamId = {}

const getSocketsForTeamId = (id, socketsForTeamId) => {
    if (id in socketsForTeamId) {
        return socketsForTeamId[id]
    } else {
        return []
    }
}

const addSocketForTeamId = (id, ws, socketsForTeamId) => {
    if (id in socketsForTeamId) {
        socketsForTeamId[id].push(ws)
    } else {
        socketsForTeamId[id] = [ws]
    }
}

const removeSocketForTeamId = (id, ws, socketsForTeamId) => {
    const index = socketsForTeamId[id].indexOf(ws)
    if (index > -1) {
        socketsForTeamId[id].splice(index, 1)
    }
}

db.onMessageNotification((msg) => {
    const socks = getSocketsForTeamId(msg.team_id, socketsForTeamId)
    for (let i = 0; i < socks.length; i++) {
        socks[i].send(JSON.stringify(msg))
    }
})

module.exports = (server, sessionParser) => {
    const wss = new WebSocket.Server({
        server,
        verifyClient: (info, done) => {
            sessionParser(info.req, {}, () => {
                if ('passport' in info.req.session) {
                    return done(true)
                }

                return done(false, 500, "Unauthorized", {})
            })
        }
    })

    wss.on('connection', async (ws, req) => {
        let user, teams

        try {
            user = await db.getUserForId(req.session.passport.user)
            teams = await db.getTeamsForUserId(user.id)
        } catch (e) {
            ws.close()
        }

        for (let i = 0; i < teams.length; i++) {
            addSocketForTeamId(teams[i].id, ws, socketsForTeamId)
        }

        ws.on('close', (code, reason) => {
            for (let i = 0; i < teams.length; i++) {
                removeSocketForTeamId(teams[i].id, ws, socketsForTeamId)
            }
        })

        ws.on('message', async (data) => {
            let json
            try {
                json = JSON.parse(data)
            } catch (e) {
                return
            }

            if (!validator.validate(json, messageSchema).valid) {
                return
            }

            if (!teams.map((t) => t.id).includes(json.team_id)) {
                return
            }

            await db.addMessage(json.message, user.id, json.team_id)
        })
    })
}
