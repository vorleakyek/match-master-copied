/* eslint-disable @typescript-eslint/no-unused-vars -- Remove when used */
// import 'dotenv/config';
// import express from 'express';
// import pg from 'pg';
// import { ClientError, errorMiddleware } from './lib/index.js';

import 'dotenv/config';
import argon2 from 'argon2';
import express from 'express';
import pg from 'pg';
import jwt from 'jsonwebtoken';

import { authMiddleware, ClientError, errorMiddleware } from './lib/index.js';

import type {
  LevelAndTheme,
  GameProgressData,
  topPlayerData,
} from '../client/src/lib/data';

type User = {
  userId: number;
  username: string;
  hashedPassword: string;
};

type Auth = {
  username: string;
  password: string;
};

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const hashKey = process.env.TOKEN_SECRET;
if (!hashKey) throw new Error('TOKEN_SECRET not found in .env');

const app = express();

// Create paths for static directories
const reactStaticDir = new URL('../client/dist', import.meta.url).pathname;
const uploadsStaticDir = new URL('public', import.meta.url).pathname;

app.use(express.static(reactStaticDir));
// Static directory for file uploads server/public/
app.use(express.static(uploadsStaticDir));
app.use(express.json());

app.post('/api/auth/sign-up', async (req, res, next) => {
  try {
    const { username: usernameRaw, password } = req.body as Partial<Auth>;
    const username = usernameRaw?.toLowerCase();

    if (!username || !password) {
      throw new ClientError(400, 'username and password are required fields');
    }

    const checkUserSql = `
      select "userId"
      from "users"
      where "username" = $1
      `;
    const checkUserResult = await db.query(checkUserSql, [username]);
    if (checkUserResult.rows.length > 0) {
      throw new ClientError(409, 'Username already exists');
    }

    const hashedPassword = await argon2.hash(password);
    const sql = `
      insert into "users" ("username", "hashedPassword")
        values ($1, $2)
        returning "userId", "username", "createdAt"
    `;
    const params = [username, hashedPassword];
    const result = await db.query<User>(sql, params);
    const [user] = result.rows;
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/sign-in', async (req, res, next) => {
  try {
    const { username: usernameRaw, password } = req.body as Partial<Auth>;
    const username = usernameRaw?.toLowerCase();
    if (!username || !password) {
      throw new ClientError(401, 'invalid login');
    }
    const sql = `
      select "userId",
            "hashedPassword"
        from "users"
        where "username" = $1
      `;
    const params = [username];
    const result = await db.query<User>(sql, params);
    const [user] = result.rows;
    if (!user) {
      throw new ClientError(401, 'invalid login');
    }
    const { userId, hashedPassword } = user;
    const isMatching = await argon2.verify(hashedPassword, password);
    if (!isMatching) {
      throw new ClientError(401, 'invalid login');
    }
    const payload = { userId, username };
    const token = jwt.sign(payload, hashKey);
    res.json({ token, user: payload });
  } catch (err) {
    res.json('invalid login');
    next(err);
  }
});

app.post('/api/level-and-theme', authMiddleware, async (req, res, next) => {
  try {
    const { level: levelRaw, cardTheme } = req.body as Partial<LevelAndTheme>;
    const level = Number(levelRaw);
    if (!level || !cardTheme) {
      throw new ClientError(400, 'level and theme are required');
    }

    const sql = `
      insert into "UserGameProgress" ("userId","level", "cardTheme")
      values ($1, $2,$3)
      returning "level","cardTheme";
    `;

    const params = [req.user?.userId, level, cardTheme];
    const result = await db.query<LevelAndTheme>(sql, params);
    const levelAndTheme = result.rows[0];
    res.status(201).json(levelAndTheme);
  } catch (err) {
    next(err);
  }
});

app.put(
  '/api/update-user-game-progress',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { level, star, score, completedTime, totalClick, sound } =
        req.body as Partial<GameProgressData>;

      if (
        !level ||
        !star ||
        (!score && score !== 0) ||
        !completedTime ||
        !totalClick ||
        sound === null
      ) {
        throw new ClientError(
          400,
          'level, star, score, completedTime, totalClick, and sound are required'
        );
      }

      const sql = `
        update "UserGameProgress"
        set "level" = $2,
            "star" = $3,
            "score" = $4,
            "completedTime" = $5,
            "totalClicked" = $6,
            "sound" = $7,
            "createdAt" = NOW()
           where "userId" = $1
           and "level"= $2
          and "createdAt" = (select max("createdAt") from "UserGameProgress" where "userId"=$1 and "level" = $2)
        returning "level", "star", "score", "completedTime", "totalClicked", "sound"
      `;

      const params = [
        req.user?.userId,
        level,
        star,
        score,
        completedTime,
        totalClick,
        sound,
      ];

      const result = await db.query<GameProgressData>(sql, params);
      const updatedData = result.rows[0];
      res.status(201).json(updatedData);
    } catch (err) {
      next(err);
    }
  }
);

app.get('/api/leadership-board', authMiddleware, async (req, res, next) => {
  try {
    const sql = `
    WITH "RankedUserScores" AS (
      SELECT
          "userId",
          "level",
          CAST("score" AS float) AS "score",
          "totalClicked",
          "star",
          CAST("completedTime" AS float) AS "completedTime",
          ROW_NUMBER() OVER (PARTITION BY "userId", "level" ORDER BY "score" DESC) AS ranking
      FROM
          "UserGameProgress"
      WHERE
          "score" IS NOT NULL
          AND "totalClicked" IS NOT NULL
          AND "star" IS NOT NULL
          AND "completedTime" IS NOT NULL
    )
    SELECT
        u."username",
        r."level",
        r."score",
        r."totalClicked",
        r."star",
        r."completedTime"
    FROM
        "RankedUserScores" as r
    JOIN
        "users" AS u ON r."userId" = u."userId"
    WHERE
        r.ranking = 1
    ORDER BY
        r."userId",
        r."level"
    `;

    const result = await db.query<topPlayerData[]>(sql);
    res.status(201).json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.get('/api/level-and-theme', authMiddleware, async (req, res, next) => {
  try {
    const sql = `
      select "level", "cardTheme"
      from "UserGameProgress"
      where "userId" = $1
      order by "createdAt" desc
    `;

    const result = await db.query<LevelAndTheme>(sql, [req.user?.userId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/*
 * Handles paths that aren't handled by any other route handler.
 * It responds with `index.html` to support page refreshes with React Router.
 * This must be the _last_ route, just before errorMiddleware.
 */
app.get('*', (req, res) => res.sendFile(`${reactStaticDir}/index.html`));

app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  console.log('Listening on port', process.env.PORT);
});
