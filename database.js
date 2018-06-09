// Uses environment vars to auth
const { Pool } = require('pg')
pool = new Pool()

module.exports = {
    /* User retrieval */
    getAllUsersForEmail: async function(email) {
        const query = 'SELECT * FROM sporganize.users WHERE email = $1'
        const users = await pool.query(query, [email])
        return users.rows
    },

    getUserForEmail: async function(email) {
        const query = 'SELECT * FROM sporganize.users WHERE email = $1'
        const users = await pool.query(query, [email])

        if (users.rows.length < 1) {
            throw new Error('No user for given id')
        }

        return users.rows[0]
    },

    getUserForId: async function(id) {
        const query = 'SELECT * FROM sporganize.users WHERE id = $1'
        const users = await pool.query(query, [id])

        if (users.rows.length < 1) {
            throw new Error('No user for given id')
        }

        return users.rows[0]
    },


    /* Team retrieval */
    getTeamForId: async function(id) {
        const query = 'SELECT * FROM sporganize.teams WHERE id = $1'
        const teams = await pool.query(query, [id])

        if (teams.rows.length < 1) {
            throw new Error('No team for given id')
        }

        return teams.rows[0]
    },

    getTeamsForUserId: async function(id) {
        const query = ['SELECT sporganize.teams.*',
                       'FROM sporganize.users',
                       'JOIN sporganize.users_teams ON users.id = users_teams.user_id',
                       'JOIN sporganize.teams ON users_teams.team_id = teams.id',
                       'WHERE users.id = $1'].join(' ')

        const teams = await pool.query(query, [id])
        return teams.rows
    },

    getTeamsForUserIDWithAccessLevel: async function(id) {
        const query = ['SELECT *',
            'FROM sporganize.teams',
            'JOIN sporganize.users_teams ON teams.id = users_teams.team_id',
            'WHERE users_teams.user_id = $1'].join(' ')

        const teams_with_access_level = await pool.query(query, [id])
        return teams_with_access_level.rows
    },


    /* Event retrieval */
    getEventsForTeamId: async function(id) {
        const query = ['SELECT sporganize.events.*',
                       'FROM sporganize.events JOIN sporganize.teams ON events.team_id = teams.id',
                       'WHERE teams.id = $1'].join(' ')

        const events = await pool.query(query, [id])
        return events.rows
    },

    getAllEventsForUserId: async function(id) {
        const teams = await this.getTeamsForUserId(id)
        events = []
        for (let i = 0; i < teams.length; i++) {
            let team_events = await this.getEventsForTeamId(teams[i].id)
            events.push(...team_events)
        }

        events.sort((a, b) => {
            if (a < b) { return -1 }
            if (a > b) { return  1 }
            return 0
        })

        return events
    },

    getEventForEventId: async function(id) {
        const query = 'SELECT * FROM sporganize.events WHERE id = $1'
        const events = await pool.query(query, [id])

        if (events.rows.length < 1) {
            throw new Error('No events for given id')
        }

        return events.rows[0]
    },

    /* Team join codes */
    // Returns -1 if code is invalid
    getTeamIdForJoinCode: async function(code) {
        const query = 'SELECT team_id, expires FROM sporganize.join_codes WHERE code = $1'
        const teams = await pool.query(query, [code])

        const now = new Date()
        for (const i = 0; i < teams.rows.length; i++) {
            const expiry = new Date(teams.rows[i].expires)
            if (expiry > now) {
                return teams.rows[i].team_id
            }
        }

        return -1
    },

    // Returns true on success, false on invalid code
    joinTeamWithJoinCodeForUserId: async function(code, id) {
        const team = await this.getTeamIdForJoinCode(code)
        if (team == -1) {
            return false
        }

        await this.addUserToTeamWithAccessLevel(id, team, 'user')
    },

    createJoinCodeForTeamId: async function(code, id) {
        const query = ['INSERT INTO sporganize.join_codes (team_id, code, expires)',
                       'VALUES ($1, $2, $3)'].join(' ')

        // Set to expire 2 days in the future
        const expiry = new Date()
        expiry.setDate(expiry.getDate() + 2)

        await pool.query(query, [id, code, expiry.toISOString()])
    },

    addUserToTeamWithAccessLevel: async function(user_id, team_id, access_level) {
        const query = ['INSERT INTO sporganize.users_teams (user_id, team_id, access_level)',
                       'VALUES ($1, $2, $3)'].join(' ')
        await pool.query(query, [user_id, team_id, access_level])
    },

    getAccessLevelForUserIDAndTeamID: async function(user_id, team_id) {
        const query = ['SELECT * FROM sporganize.users_teams WHERE user_id = $1 AND team_id = $2'].join(' ')
        const permission = await pool.query(query, [user_id, team_id])
        return permission.rows[0].access_level
    },

    /* User, team, event creation */
    createUser: async function(forename, surname, gender, email, mobile, password_hash) {
        const query = ['INSERT INTO sporganize.users (forename, surname, gender, email, mobile, password_hash)',
                       'VALUES ($1, $2, $3, $4, $5, $6)'].join(' ')
        await pool.query(query, [forename, surname, gender, email, mobile, password_hash])
    },

    // Returns id of new team on successful insertion
    createTeam: async function(name, type, description) {
        const query = 'INSERT INTO sporganize.teams (name, type, description) VALUES ($1, $2, $3) RETURNING id'
        const resp = await pool.query(query, [name, type, description])
        return resp.rows[0].id
    },

    createEvent: async function(team_id, name, timestamp, duration, location) {
        const query = ['INSERT INTO sporganize.events (team_id, name, timestamp, duration, location)',
                       'VALUES ($1, $2, $3, $4, $5)'].join(' ')
        await pool.query(query, [team_id, name, timestamp, duration, location])
    }
}
