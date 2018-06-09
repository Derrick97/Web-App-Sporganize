CREATE SCHEMA IF NOT EXISTS sporganize;

CREATE TYPE sporganize.gender AS ENUM ('male', 'female', 'other');
CREATE TYPE sporganize.access_level AS ENUM ('admin', 'manager', 'user');
CREATE TYPE sporganize.attendance_status AS ENUM ('confirmed', 'rejected', 'noreply');

CREATE TABLE sporganize.teams (
    id          serial PRIMARY KEY,
    name        text CHECK (length(name) < 256)         NOT NULL,
    description text CHECK (length(description) < 1000) NOT NULL,
    type        text CHECK (length(type) < 256)         NOT NULL
);

CREATE TABLE sporganize.users (
    id            serial PRIMARY KEY,
    forename      text CHECK (length(forename) < 256) NOT NULL,
    surname       text CHECK (length(surname) < 256)  NOT NULL,
    gender        sporganize.gender                   NOT NULL,
    email         text CHECK (length(email) < 256)    NOT NULL,
    mobile        text CHECK (length(mobile) < 40)    NOT NULL,
    password_hash text                                NOT NULL
);

CREATE TABLE sporganize.users_teams (
    user_id      int REFERENCES sporganize.users (id) ON DELETE CASCADE NOT NULL,
    team_id      int REFERENCES sporganize.teams (id) ON DELETE CASCADE NOT NULL,
    access_level sporganize.access_level                                NOT NULL,
    PRIMARY KEY (user_id, team_id)
);

CREATE TABLE sporganize.events (
    id        serial PRIMARY KEY,
    team_id   int REFERENCES sporganize.teams (id) ON DELETE CASCADE NOT NULL,
    name      text CHECK (length(name) < 256)                        NOT NULL,
    timestamp timestamp                                              NOT NULL,
    duration  interval                                               NOT NULL,
    location  text CHECK(length(location) < 256)                     NOT NULL
);

CREATE TABLE sporganize.users_events (
    user_id  int REFERENCES sporganize.users (id) ON DELETE CASCADE  NOT NULL,
    event_id int REFERENCES sporganize.events (id) ON DELETE CASCADE NOT NULL,
    status   sporganize.attendance_status                            NOT NULL,
    PRIMARY KEY (user_id, event_id)
);

CREATE TABLE sporganize.photos (
    id       serial PRIMARY KEY,
    event_id int REFERENCES sporganize.events (id) ON DELETE CASCADE NOT NULL,
    photo    bytea                                                   NOT NULL
);

CREATE TABLE sporganize.join_codes (
    id      serial PRIMARY KEY,
    team_id int REFERENCES sporganize.teams (id) ON DELETE CASCADE NOT NULL,
    code    text CHECK(length(code) < 30)                          NOT NULL,
    expires timestamp                                              NOT NULL
);
