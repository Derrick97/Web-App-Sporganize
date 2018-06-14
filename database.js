// Uses environment vars to auth
const {Pool, Client} = require('pg')
pool = new Pool()

module.exports = {
    /* User retrieval */
    getAllUsersForEmail: async function (email) {
        const query = 'SELECT * FROM sporganize.users WHERE email = $1'
        const users = await pool.query(query, [email])
        return users.rows
    },

    getUserForEmail: async function (email) {
        const query = 'SELECT * FROM sporganize.users WHERE email = $1'
        const users = await pool.query(query, [email])

        if (users.rows.length < 1) {
            throw new Error('No user for given id')
        }

        return users.rows[0]
    },

    getCreatorForTeamID: async function (team_id) {
        const query = ['SELECT * FROM sporganize.users_teams JOIN sporganize.users ON users.id = users_teams.user_id',
            'WHERE users_teams.team_id = $1 AND users_teams.access_level = $2'].join(' ')
        const creatorInfo = await pool.query(query, [team_id, 'admin'])
        return creatorInfo.rows[0]
    },

    getUserForId: async function (id) {
        const query = 'SELECT * FROM sporganize.users WHERE id = $1'
        const users = await pool.query(query, [id])

        if (users.rows.length < 1) {
            throw new Error('No user for given id')
        }

        return users.rows[0]
    },

    getAllUsersFromEventsWithStatus: async function (event_id, status) {
        const query = ['SELECT * FROM sporganize.users_events ',
            'JOIN sporganize.users ON users.id = users_events.user_id',
            'WHERE users_events.event_id = $1 AND users_events.status = $2'].join(' ')
        const users = await pool.query(query, [event_id, status])
        return users.rows
    },

    getAllUsersInfoForTeam: async function (id) {
        const query = ['SELECT *',
            'FROM sporganize.users_teams',
            'JOIN sporganize.users ON users.id = users_teams.user_id',
            'WHERE users_teams.team_id = $1'].join(' ')
        const users = await pool.query(query, [id])
        return users.rows
    },

    /* Team retrieval */
    getTeamForId: async function (id) {
        const query = 'SELECT * FROM sporganize.teams WHERE id = $1'
        const teams = await pool.query(query, [id])

        if (teams.rows.length < 1) {
            throw new Error('No team for given id')
        }

        return teams.rows[0]
    },

    getTeamsForUserId: async function (id) {
        const query = ['SELECT sporganize.teams.*',
            'FROM sporganize.users',
            'JOIN sporganize.users_teams ON users.id = users_teams.user_id',
            'JOIN sporganize.teams ON users_teams.team_id = teams.id',
            'WHERE users.id = $1'].join(' ')

        const teams = await pool.query(query, [id])
        return teams.rows
    },

    getTeamsForUserIDWithAccessLevel: async function (id) {
        const query = ['SELECT *',
            'FROM sporganize.teams',
            'JOIN sporganize.users_teams ON teams.id = users_teams.team_id',
            'WHERE users_teams.user_id = $1'].join(' ')

        const teams_with_access_level = await pool.query(query, [id])
        return teams_with_access_level.rows
    },


    /* Event retrieval */
    getEventsForTeamId: async function (id) {
        const query = ['SELECT sporganize.events.*',
            'FROM sporganize.events JOIN sporganize.teams ON events.team_id = teams.id',
            'WHERE teams.id = $1'].join(' ')

        const events = await pool.query(query, [id])
        return events.rows
    },

    getAllEventsForUserId: async function (id) {
        const teams = await this.getTeamsForUserId(id)
        events = []
        for (let i = 0; i < teams.length; i++) {
            let team_events = await this.getEventsForTeamId(teams[i].id)
            events.push(...team_events)
        }

        events.sort((a, b) => {
            if (a < b) {
                return -1
            }
            if (a > b) {
                return 1
            }
            return 0
        })

        return events
    },


    getAllEventsForUserIdWithAccessLevelAndStatus: async function (id) {
        const query = ['SELECT * ',
            'FROM sporganize.events JOIN sporganize.users_teams ON events.team_id = users_teams.team_id',
            'JOIN sporganize.users_events ON users_events.event_id = events.id AND users_events.user_id = users_teams.user_id',
            'WHERE users_teams.user_id = $1'].join(' ')
        const events_with_access_level_and_status = await pool.query(query, [id])
        events = []

        events.push(...events_with_access_level_and_status.rows)

        events.sort((a, b) => {
            if (a.timestamp < b.timestamp) {
                return -1
            }
            if (a.timestamp > b.timestamp) {
                return 1
            }
            return 0
        })
        return events

    },

    getAllEventsForTeamIdWithAccessLevelAndStatus: async function (team_id, user_id) {
        const query = ['SELECT * ',
            'FROM sporganize.events JOIN sporganize.users_teams ON events.team_id = users_teams.team_id ',
            'JOIN sporganize.users_events ON users_events.event_id = events.id AND users_events.user_id = users_teams.user_id',
            'WHERE users_teams.team_id = $1 AND users_teams.user_id = $2'].join(' ')
        const events_with_access_level_and_status = await pool.query(query, [team_id, user_id])
        events = []

        events.push(...events_with_access_level_and_status.rows)

        events.sort((a, b) => {
            if (a.timestamp < b.timestamp) {
                return -1
            }
            if (a.timestamp > b.timestamp) {
                return 1
            }
            return 0
        })
        return events
    },

    getEventForEventIDWithStatus: async function (event_id, user_id) {
        const query = ['SELECT *',
            'FROM sporganize.events JOIN sporganize.users_events ON events.id = users_events.event_id',
            'WHERE events.id = $1 AND users_events.user_id = $2'].join(' ')
        const event = await pool.query(query, [event_id, user_id])
        // console.log(event.length)
        return event.rows[0]
    },

    getEventForEventId: async function (id) {
        const query = 'SELECT * FROM sporganize.events WHERE id = $1'
        const events = await pool.query(query, [id])

        if (events.rows.length < 1) {
            throw new Error('No events for given id')
        }

        return events.rows[0]
    },

    /* Team join codes */
    // Returns -1 if code is invalid
    getTeamIdForJoinCode: async function (code) {
        const query = 'SELECT team_id, expires FROM sporganize.join_codes WHERE code = $1'
        const teams = await pool.query(query, [code])

        const now = new Date()
        for (let i = 0; i < teams.rows.length; i++) {
            const expiry = new Date(teams.rows[i].expires)
            if (expiry > now) {
                return teams.rows[i].team_id
            }
        }

        return -1
    },

    getCurrentJoinCodeForTeamID: async function (team_id) {
        const query = 'SELECT * FROM sporganize.join_codes WHERE join_codes.team_id = $1'
        const join_code_info = await pool.query(query, [team_id])
        let temp = join_code_info.rows[0]
        for (let i = 0; i < join_code_info.rows.length; i++) {
            if(temp.id < join_code_info.rows[i].id){
                temp = join_code_info.rows[i]
            }
        }
        return temp
    },

    // Returns true on success, false on invalid code
    joinTeamWithJoinCodeForUserId: async function (code, id) {
        const team = await this.getTeamIdForJoinCode(code)
        if (team == -1) {
            return false
        }
        try {
            await this.addUserToTeamWithAccessLevel(id, team, 'user')
        } catch (e) {
            return e
        }
        const all_events_for_team = await this.getEventsForTeamId(team)
        for (let i = 0; i < all_events_for_team.length; i++) {
            await this.addUserToEventWithStatus(id, all_events_for_team[i].id, 'noreply')
        }
        return true
    },

    createJoinCodeForTeamId: async function (code, id) {
        const query = ['INSERT INTO sporganize.join_codes (team_id, code, expires)',
            'VALUES ($1, $2, $3)'].join(' ')

        // Set to expire 2 days in the future
        const expiry = new Date()
        expiry.setDate(expiry.getDate() + 2)

        await pool.query(query, [id, code, expiry.toISOString()])
    },

    addUserToTeamWithAccessLevel: async function (user_id, team_id, access_level) {
        const query = ['INSERT INTO sporganize.users_teams (user_id, team_id, access_level)',
            'VALUES ($1, $2, $3)'].join(' ')
        await pool.query(query, [user_id, team_id, access_level])
    },

    getAccessLevelForUserIDAndTeamID: async function (user_id, team_id) {
        const query = ['SELECT * FROM sporganize.users_teams WHERE user_id = $1 AND team_id = $2'].join(' ')
        const permission = await pool.query(query, [user_id, team_id])
        return permission.rows[0].access_level
    },

    /* User, team, event creation */
    createUser: async function (forename, surname, gender, email, mobile, password_hash) {
        const query = ['INSERT INTO sporganize.users (forename, surname, gender, email, mobile, password_hash)',
            'SELECT $1, $2, $3, $4, $5, $6',
            'WHERE',
            'NOT EXISTS (',
            'SELECT * FROM sporganize.users WHERE sporganize.users.email = $4 )'].join(' ')
        return await pool.query(query, [forename, surname, gender, email, mobile, password_hash])
    },

    // Returns id of new team on successful insertion
    createTeam: async function (name, type, description) {
        const query = 'INSERT INTO sporganize.teams (name, type, description) VALUES ($1, $2, $3) RETURNING id'
        const resp = await pool.query(query, [name, type, description])
        return resp.rows[0].id
    },

    createEvent: async function (creator_user_id, team_id, name, timestamp, duration, location) {
        const query = ['INSERT INTO sporganize.events (team_id, name, timestamp, duration, location)',
            'VALUES ($1, $2, $3, $4, $5)'].join(' ')
        await pool.query(query, [team_id, name, timestamp, duration, location])
        const allEvents = await this.getAllEventsForUserId(creator_user_id)
        let temp = allEvents[0].id
        for (let j = 0; j < allEvents.length; j++) {
            if (temp < allEvents[j].id) {
                temp = allEvents[j].id
            }
        }
        const current_event_id = temp
        const all_users_for_current_event = await this.getAllUsersInfoForTeam(team_id)
        for (let i = 0; i < all_users_for_current_event.length; i++) {
            await this.addUserToEventWithStatus(all_users_for_current_event[i].user_id, current_event_id, 'noreply')
        }
    },

    addUserToEventWithStatus: async function (user_id, event_id, status) {
        const query = ['INSERT INTO sporganize.users_events (user_id, event_id, status)',
            'VALUES ($1, $2, $3)'].join(' ')
        await pool.query(query, [user_id, event_id, status])
    },

    changeEventStatusForUserID: async function (user_id, event_id, status) {
        const query = ['UPDATE sporganize.users_events',
            'SET status = $3 WHERE users_events.user_id = $1 AND users_events.event_id = $2'].join(' ')
        await pool.query(query, [user_id, event_id, status])
    },

    changeEventDetailsForUserID: async function (event_id, new_name, new_location, new_date, new_duration) {
        const query = ['UPDATE sporganize.events',
            'SET name = $2, location = $3, timestamp = $4, duration = $5',
            'WHERE events.id = $1'
        ].join(' ')
        await pool.query(query, [event_id, new_name, new_location, new_date, new_duration])
    },

    deleteEventForEventID: async function (event_id) {
        const query = 'DELETE FROM sporganize.events WHERE events.id = $1'
        await pool.query(query, [event_id])
    },

    changeMobileForUserID: async function (user_id, mobile){
        const query = ['UPDATE sporganize.users',
            'SET mobile = $2',
            'WHERE id = $1'].join(' ')
        await pool.query(query, [user_id, mobile])
    },

    changeTeamDetailsForTeamID: async function (team_id, name, description) {
        const query = ['UPDATE sporganize.teams',
            'SET name = $2, description = $3',
            'WHERE id = $1'].join(' ')
        await pool.query(query, [team_id, name, description])
    },

    changeAccessLevelForUserID: async function (user_id, team_id, access_level) {
        const query = ['UPDATE sporganize.users_teams',
        'SET access_level = $3',
        'WHERE user_id = $1 AND team_id = $2'].join(' ')
        await pool.query(query, [user_id, team_id, access_level])
    },

    removeMemberForUserIDAndTeamID: async function (user_id, team_id){
        let query = 'DELETE FROM sporganize.users_teams WHERE user_id = $1 AND team_id = $2'
        await pool.query(query, [user_id, team_id])
        const allEvent = await this.getEventsForTeamId(team_id)
        for(let i = 0; i<allEvent.length;i++){
            let query2 = 'DELETE FROM sporganize.users_events WHERE user_id = $1 AND event_id = $2'
            await pool.query(query2, [user_id, allEvent[i].id])
        }
    },

    dismissTeamForTeamID: async function (team_id) {
        const query = 'DELETE FROM sporganize.teams WHERE teams.id = $1'
        await pool.query(query, [team_id])
    },

    /* Messaging */
    onMessageNotification: async function (callback) {
        const client = new Client()
        await client.connect()

        await client.query('LISTEN sporganize_messages')
        client.on('notification', (msg) => { callback(JSON.parse(msg.payload)) })
    },

    addMessage: async function(message, user_id, team_id) {
        let query = ['INSERT INTO sporganize.messages (team_id, user_id, message)',
                     'VALUES ($1, $2, $3)',
                     'RETURNING *'].join(' ')

        const resp = await pool.query(query, [team_id, user_id, message])
        await pool.query("SELECT pg_notify('sporganize_messages', $1)",
                         [JSON.stringify(resp.rows[0])])

        return resp.rows[0]
    },

    getMessagesForTeamId: async function(id, n) {
        let query = ['SELECT * FROM sporganize.messages',
                     'WHERE team_id = $1',
                     'ORDER BY timestamp DESC',
                     'LIMIT $2'].join(' ')
        const resp = await pool.query(query, [id, n])
        return resp.rows
    }
}
