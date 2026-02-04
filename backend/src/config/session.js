import session from 'express-session';
import pgSession from 'connect-pg-simple';
import fs from 'fs';
import { getPool } from './db.js';

const PgSession = pgSession(session);

const sessionStore = new PgSession({
    pool: getPool(),
    tableName: 'session',
    createTableIfMissing: false
});

let sessionSecret = process.env.SESSION_SECRET;
const searchPath = '/run/secrets/session_secret';
if (!sessionSecret && fs.existsSync(searchPath)) {
    try {
        sessionSecret = fs.readFileSync(searchPath, 'utf8').trim();
    } catch (error) {
        console.error('Docker Secretの読み込みに失敗しました: ', error.message);
    }
}
sessionSecret = sessionSecret || 'fallback_secret_key';

export const sessionConfig = {
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 8,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
};