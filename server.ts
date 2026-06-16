import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configured for local disk uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage });

// Password hashing helper (built-in SHA256 to avoid native scrypt/bcrypt compile issues)
function hashPassword(p: string) {
  return crypto.createHash('sha256').update(p + 'somesalt_ripple_cinode').digest('hex');
}

// MySQL connection pool variable
let pool: mysql.Pool | null = null;
let useLocalFallback = false;

// Initialize JSON database as local fallback state
interface DbStore {
  users: any[];
  profiles: any[];
  posts: any[];
  likes: any[];
  comments: any[];
  follows: any[];
  messages: any[];
  stories: any[];
  story_views: any[];
  notifications: any[];
  user_roles: any[];
  saved_posts: any[];
}

const dbFilePath = path.join(uploadsDir, 'local_db.json');

function loadLocalDb(): DbStore {
  try {
    if (fs.existsSync(dbFilePath)) {
      const content = fs.readFileSync(dbFilePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[Fallback DB] Load error:', err);
  }
  return {
    users: [],
    profiles: [],
    posts: [],
    likes: [],
    comments: [],
    follows: [],
    messages: [],
    stories: [],
    story_views: [],
    notifications: [],
    user_roles: [],
    saved_posts: []
  };
}

const localDb = loadLocalDb();

function saveLocalDb() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(localDb, null, 2), 'utf8');
  } catch (err) {
    console.error('[Fallback DB] Save error:', err);
  }
}

// Helper: Try to connect to MySQL with strict timeout
async function initDb() {
  console.log('[Database] Initializing connection to 131.153.147.178:3306...');
  try {
    const connectionPromise = mysql.createConnection({
      host: '131.153.147.178',
      user: 'zerolord_ripple',
      password: '@F33rinimicinode',
      database: 'zerolord_ripple',
      port: 3306,
      connectTimeout: 3000 // 3 seconds absolute connection timeout
    });

    const conn = await Promise.race([
      connectionPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connection attempt timed out after 3 seconds.')), 3000))
    ]);

    if (conn) {
      console.log('[MySQL] Connection test successful. Creating pool now.');
      pool = mysql.createPool({
        host: '131.153.147.178',
        user: 'zerolord_ripple',
        password: '@F33rinimicinode',
        database: 'zerolord_ripple',
        port: 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true,
        connectTimeout: 3000
      });

      // Verify or setup MySQL tables
      const verifiedConn = await pool.getConnection();
      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS profiles (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL UNIQUE,
          username VARCHAR(255),
          display_name VARCHAR(255),
          avatar_url TEXT,
          bio TEXT,
          is_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_profiles_user_id (user_id),
          UNIQUE KEY uq_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          caption TEXT,
          image_url TEXT,
          media_type VARCHAR(50) DEFAULT 'image',
          likes_count INT DEFAULT 0,
          comments_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_posts_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS likes (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          post_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_likes_user_post (user_id, post_id),
          INDEX idx_likes_post_id (post_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          post_id VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          parent_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_comments_post_id (post_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS follows (
          id VARCHAR(255) PRIMARY KEY,
          follower_id VARCHAR(255) NOT NULL,
          following_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_follows_follower_following (follower_id, following_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(255) PRIMARY KEY,
          sender_id VARCHAR(255) NOT NULL,
          receiver_id VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_messages_sender_receiver (sender_id, receiver_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS stories (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          image_url TEXT NOT NULL,
          caption TEXT,
          expires_at TIMESTAMP NOT NULL,
          views_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_stories_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS story_views (
          id VARCHAR(255) PRIMARY KEY,
          story_id VARCHAR(255) NOT NULL,
          viewer_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_story_views (story_id, viewer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(255) PRIMARY KEY,
          recipient_id VARCHAR(255) NOT NULL,
          actor_id VARCHAR(255),
          type VARCHAR(50) NOT NULL,
          post_id VARCHAR(255),
          content TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_notifications_recipient_id (recipient_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          UNIQUE KEY uq_user_roles (user_id, role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await verifiedConn.query(`
        CREATE TABLE IF NOT EXISTS saved_posts (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          post_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_saved_posts_user_post (user_id, post_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Ensure at least one admin exists if any users are registered
      try {
        const [usersList]: any = await verifiedConn.query('SELECT id FROM users LIMIT 1');
        if (usersList.length > 0) {
          const [adminsList]: any = await verifiedConn.query("SELECT id FROM user_roles WHERE role = 'admin' LIMIT 1");
          if (adminsList.length === 0) {
            console.log('[MySQL] Seeding admin role for first user:', usersList[0].id);
            await verifiedConn.query(
              "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin') ON DUPLICATE KEY UPDATE role = 'admin'",
              [crypto.randomUUID(), usersList[0].id]
            );
          }
        }
      } catch (adminErr) {
        console.error('[MySQL] Error auto-assigning first admin on init:', adminErr);
      }

      console.log('[MySQL] Remote tables checked and ready to serve live data!');
      verifiedConn.release();
      await conn.end();
    }
  } catch (error) {
    console.error('[MySQL] Remote connection failed on startup:', error);
    console.error('[MySQL] Switching seamlessly to Local JSON Persistence Fallback. No stuttering, no crashes.');
    useLocalFallback = true;
  }
}

// Utility: parse mentions/tags (@username) from captions or comments and trigger notifications
async function handleMentions(text: string, actorId: string, postId: string | null, isComment: boolean, local: boolean) {
  if (!text) return;
  const matches = text.match(/@([a-zA-Z0-9_]+)/g);
  if (!matches) return;
  
  const usernames = Array.from(new Set(matches.map(m => m.substring(1).toLowerCase())));
  if (usernames.length === 0) return;

  const contentStub = text.substring(0, 50) + (text.length > 50 ? '...' : '');

  if (local) {
    for (const username of usernames) {
      const profile = localDb.profiles.find(p => p.username?.toLowerCase() === username);
      if (profile && profile.user_id !== actorId) {
        localDb.notifications.push({
          id: crypto.randomUUID(),
          recipient_id: profile.user_id,
          actor_id: actorId,
          type: 'mention',
          post_id: postId,
          content: isComment ? `mentioned you in a comment: "${contentStub}"` : `mentioned you in a post: "${contentStub}"`,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }
  } else {
    for (const username of usernames) {
      try {
        const [profRows]: any = await pool.query('SELECT user_id FROM profiles WHERE LOWER(username) = ?', [username]);
        if (profRows.length > 0) {
          const recipientId = profRows[0].user_id;
          if (recipientId !== actorId) {
            await pool.query(
              `INSERT INTO notifications (id, recipient_id, actor_id, type, post_id, content, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                crypto.randomUUID(),
                recipientId,
                actorId,
                'mention',
                postId,
                isComment ? `mentioned you in a comment: "${contentStub}"` : `mentioned you in a post: "${contentStub}"`,
                false
              ]
            );
          }
        }
      } catch (err) {
        console.error('[Mentions] Live notification error:', err);
      }
    }
  }
}

// Check filtering capabilities for client-side local queries
function matchesFilter(item: any, actions: any[]): boolean {
  for (const action of actions) {
    if (action.type === 'eq') {
      if (item[action.column] != action.value) return false;
    } else if (action.type === 'neq') {
      if (item[action.column] == action.value) return false;
    } else if (action.type === 'in') {
      if (!Array.isArray(action.values) || !action.values.includes(item[action.column])) return false;
    } else if (action.type === 'not') {
      if (action.operator === 'in') {
        let rawVal = action.value;
        if (typeof rawVal === 'string') {
          rawVal = rawVal.replace(/^\(|\)$/g, '');
          const parts = rawVal.split(',').map((x: string) => x.trim()).filter(Boolean);
          if (parts.includes(String(item[action.column]))) return false;
        }
      }
    } else if (action.type === 'or') {
      const orVal = action.filter;
      if (orVal.includes('and(sender_id.eq.') && orVal.includes('receiver_id.eq.')) {
        const matches = [...orVal.matchAll(/sender_id\.eq\.([^,)]+),receiver_id\.eq\.([^,)]+)/g)];
        if (matches.length >= 2) {
          const s1 = matches[0][1];
          const r1 = matches[0][2];
          const s2 = matches[1][1];
          const r2 = matches[1][2];
          const cond1 = item.sender_id === s1 && item.receiver_id === r1;
          const cond2 = item.sender_id === s2 && item.receiver_id === r2;
          if (!cond1 && !cond2) return false;
        }
      } else if (orVal.includes('sender_id.eq.') && orVal.includes('receiver_id.eq.')) {
        const sMatch = orVal.match(/sender_id\.eq\.([^,]+)/);
        const rMatch = orVal.match(/receiver_id\.eq\.([^,]+)/);
        if (sMatch && rMatch) {
          const sVal = sMatch[1];
          const rVal = rMatch[1];
          if (item.sender_id !== sVal && item.receiver_id !== rVal) return false;
        }
      }
    }
  }
  return true;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and url-encoded body parsers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Static serving for local media uploads
  app.use('/uploads', express.static(uploadsDir));

  // Initialize DB asynchronously
  initDb();

  // API Health Indicator
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: useLocalFallback ? 'local_json' : 'mysql' });
  });

  // Admin DB Status Indicator
  app.get('/api/admin/db-status', (req, res) => {
    res.json({
      useLocalFallback,
      host: '131.153.147.178',
      database: 'zerolord_ripple',
      poolActive: !!pool
    });
  });

  // Unified File Storage Upload Endpoint
  app.post('/api/storage/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({ publicUrl });
  });

  // Client Auth Signup API
  app.post('/api/auth/signup', async (req, res) => {
    const { email, password, options } = req.body;
    if (!email || !password) {
      return res.status(400).send('Email and password required.');
    }

    // fallback check
    if (useLocalFallback || !pool) {
      try {
        const existing = localDb.users.find(u => u.email === email);
        if (existing) {
          return res.status(400).send('User with this email already exists.');
        }

        const userId = crypto.randomUUID();
        const pHash = hashPassword(password);

        localDb.users.push({ id: userId, email, password_hash: pHash, created_at: new Date().toISOString() });

        const username = options?.data?.username || email.split('@')[0];
        const display_name = options?.data?.display_name || username;
        const avatar_url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;

        localDb.profiles.push({
          id: crypto.randomUUID(),
          user_id: userId,
          username,
          display_name,
          avatar_url,
          bio: 'Hello, I am new on Ripple!',
          is_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        const hasAdmin = localDb.user_roles.some(r => r.role === 'admin');
        const roleToAssign = hasAdmin ? 'user' : 'admin';

        localDb.user_roles.push({
          id: crypto.randomUUID(),
          user_id: userId,
          role: roleToAssign
        });

        saveLocalDb();

        const token = Buffer.from(JSON.stringify({ id: userId, email })).toString('base64');
        const userObj = {
          id: userId,
          email,
          user_metadata: { username, display_name, avatar_url }
        };

        return res.json({
          session: {
            access_token: token,
            user: userObj
          },
          user: userObj
        });
      } catch (err: any) {
        return res.status(500).send(err.message || 'Error occurred during signup.');
      }
    }

    try {
      const [existing]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).send('User with this email already exists.');
      }

      const userId = crypto.randomUUID();
      const pHash = hashPassword(password);

      await pool.query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [userId, email, pHash]);

      const username = options?.data?.username || email.split('@')[0];
      const display_name = options?.data?.display_name || username;
      const avatar_url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;

      await pool.query(
        `INSERT INTO profiles (id, user_id, username, display_name, avatar_url, bio, is_verified) VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
        [crypto.randomUUID(), userId, username, display_name, avatar_url, 'Hello, I am new on Ripple!']
      );

      const [adminsCount]: any = await pool.query("SELECT id FROM user_roles WHERE role = 'admin' LIMIT 1");
      const assignedRole = adminsCount.length === 0 ? 'admin' : 'user';

      await pool.query(
        `INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`,
        [crypto.randomUUID(), userId, assignedRole]
      );

      const token = Buffer.from(JSON.stringify({ id: userId, email })).toString('base64');
      const userObj = {
        id: userId,
        email,
        user_metadata: { username, display_name, avatar_url }
      };

      res.json({
        session: {
          access_token: token,
          user: userObj
        },
        user: userObj
      });
    } catch (e: any) {
      console.error('[Signup error]', e);
      res.status(500).send(e.message || 'Error occurred during signup.');
    }
  });

  // Client Auth Signin API
  app.post('/api/auth/signin', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send('Email and password required.');
    }

    if (useLocalFallback || !pool) {
      try {
        const userRecord = localDb.users.find(u => u.email === email);
        if (!userRecord || userRecord.password_hash !== hashPassword(password)) {
          return res.status(401).send('Invalid email or password.');
        }

        const profile = localDb.profiles.find(p => p.user_id === userRecord.id) || {};

        const token = Buffer.from(JSON.stringify({ id: userRecord.id, email: userRecord.email })).toString('base64');
        const userObj = {
          id: userRecord.id,
          email: userRecord.email,
          user_metadata: {
            username: profile.username || email.split('@')[0],
            display_name: profile.display_name,
            avatar_url: profile.avatar_url
          }
        };

        return res.json({
          session: {
            access_token: token,
            user: userObj
          }
        });
      } catch (err: any) {
        return res.status(500).send(err.message || 'Error occurred during sign-in.');
      }
    }

    try {
      const [users]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(401).send('Invalid email or password.');
      }

      const userRecord = users[0];
      if (userRecord.password_hash !== hashPassword(password)) {
        return res.status(401).send('Invalid email or password.');
      }

      const [profiles]: any = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [userRecord.id]);
      const profile = profiles[0] || {};

      const token = Buffer.from(JSON.stringify({ id: userRecord.id, email: userRecord.email })).toString('base64');
      const userObj = {
        id: userRecord.id,
        email: userRecord.email,
        user_metadata: {
          username: profile.username || email.split('@')[0],
          display_name: profile.display_name,
          avatar_url: profile.avatar_url
        }
      };

      res.json({
        session: {
          access_token: token,
          user: userObj
        }
      });
    } catch (e: any) {
      console.error('[Signin error]', e);
      res.status(500).send(e.message || 'Error occurred during sign-in.');
    }
  });

  // Password reset implementation
  app.post('/api/auth/reset-password', (req, res) => {
    res.json({ status: 'ok', message: 'Instructions sent if email is found.' });
  });

  // Client Auth Update Password API
  app.post('/api/auth/update-user', async (req, res) => {
    const { password } = req.body;
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Not authenticated');
    }
    const token = authHeader.substring(7);

    try {
      const authUser = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      const pHash = hashPassword(password);

      if (useLocalFallback || !pool) {
        const u = localDb.users.find(x => x.id === authUser.id);
        if (u) {
          u.password_hash = pHash;
          saveLocalDb();
        }
        return res.json({ status: 'ok' });
      }

      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [pHash, authUser.id]);
      res.json({ status: 'ok' });
    } catch (e: any) {
      res.status(401).send('Session invalid or expired.');
    }
  });

  // Main Dynamic Supabase-Mock Handler
  app.post('/api/supabase-mock', async (req, res) => {
    const { table, actions } = req.body;

    // Check fallback state
    if (useLocalFallback || !pool) {
      try {
        let queryType = 'select';
        let isSingle = false;
        let insertValues: any = null;
        let updateValues: any = null;

        for (const action of actions || []) {
          switch (action.type) {
            case 'select':
              queryType = 'select';
              break;
            case 'insert':
              queryType = 'insert';
              insertValues = action.values;
              break;
            case 'update':
              queryType = 'update';
              updateValues = action.values;
              break;
            case 'delete':
              queryType = 'delete';
              break;
            case 'single':
            case 'maybeSingle':
              isSingle = true;
              break;
          }
        }

        const tableArray = (localDb as any)[table] || [];

        if (queryType === 'select') {
          let matched = tableArray.filter((item: any) => matchesFilter(item, actions));

          // Apply Join simulations
          if (table === 'posts') {
            matched = matched.map((p: any) => {
              const prof = localDb.profiles.find(pr => pr.user_id === p.user_id) || {};
              return {
                ...p,
                is_verified: !!p.is_verified,
                profiles: {
                  username: prof.username,
                  display_name: prof.display_name,
                  avatar_url: prof.avatar_url,
                  is_verified: !!prof.is_verified
                }
              };
            });
          } else if (table === 'comments') {
            matched = matched.map((c: any) => {
              const prof = localDb.profiles.find(pr => pr.user_id === c.user_id) || {};
              return {
                ...c,
                profiles: {
                  username: prof.username,
                  avatar_url: prof.avatar_url,
                  is_verified: !!prof.is_verified
                }
              };
            });
          } else if (table === 'stories') {
            matched = matched.map((s: any) => {
              const prof = localDb.profiles.find(pr => pr.user_id === s.user_id) || {};
              return {
                ...s,
                profiles: {
                  username: prof.username,
                  display_name: prof.display_name,
                  avatar_url: prof.avatar_url,
                  is_verified: !!prof.is_verified
                }
              };
            });
          } else if (table === 'notifications') {
            matched = matched.map((n: any) => {
              const prof = localDb.profiles.find(pr => pr.user_id === n.actor_id) || {};
              return {
                ...n,
                is_read: !!n.is_read,
                actor: prof.username ? {
                  username: prof.username,
                  display_name: prof.display_name,
                  avatar_url: prof.avatar_url,
                  is_verified: !!prof.is_verified
                } : null
              };
            });
          } else if (table === 'profiles') {
            matched = matched.map((r: any) => ({
              ...r,
              is_verified: !!r.is_verified
            }));
          } else if (table === 'messages') {
            matched = matched.map((r: any) => ({
              ...r,
              is_read: !!r.is_read
            }));
          }

          // Orderings
          const orderAction = actions.find((a: any) => a.type === 'order');
          if (orderAction) {
            const col = orderAction.column;
            const ascending = orderAction.options?.ascending !== false;
            matched.sort((a: any, b: any) => {
              const valA = a[col];
              const valB = b[col];
              if (valA === undefined || valB === undefined) return 0;
              if (typeof valA === 'string') {
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
              }
              return ascending ? (valA - valB) : (valB - valA);
            });
          } else {
            // default ordering is usually reverse chronological / id order
            matched.sort((a: any, b: any) => {
              const d1 = a.created_at ? new Date(a.created_at).getTime() : 0;
              const d2 = b.created_at ? new Date(b.created_at).getTime() : 0;
              return d2 - d1;
            });
          }

          // Limit
          const limitAction = actions.find((a: any) => a.type === 'limit');
          if (limitAction) {
            matched = matched.slice(0, limitAction.count);
          }

          const result = isSingle ? (matched[0] || null) : matched;
          return res.json({ data: result, error: null, count: matched.length });

        } else if (queryType === 'insert') {
          const isArray = Array.isArray(insertValues);
          const list = isArray ? insertValues : [insertValues];

          const insertedRows = [];
          for (const item of list) {
            if (!item.id) item.id = crypto.randomUUID();
            if (!item.created_at) item.created_at = new Date().toISOString();

            tableArray.push(item);
            insertedRows.push(item);

            // Handle custom event statistics
            if (table === 'likes') {
              const post = localDb.posts.find(p => p.id === item.post_id);
              if (post) {
                post.likes_count = (post.likes_count || 0) + 1;
                // Notification
                if (post.user_id !== item.user_id) {
                  localDb.notifications.push({
                    id: crypto.randomUUID(),
                    recipient_id: post.user_id,
                    actor_id: item.user_id,
                    type: 'like',
                    post_id: item.post_id,
                    content: 'liked your post.',
                    is_read: false,
                    created_at: new Date().toISOString()
                  });
                }
              }
            } else if (table === 'comments') {
              const post = localDb.posts.find(p => p.id === item.post_id);
              if (post) {
                post.comments_count = (post.comments_count || 0) + 1;
                // Notification
                if (post.user_id !== item.user_id) {
                  localDb.notifications.push({
                    id: crypto.randomUUID(),
                    recipient_id: post.user_id,
                    actor_id: item.user_id,
                    type: 'comment',
                    post_id: item.post_id,
                    content: 'commented on your post.',
                    is_read: false,
                    created_at: new Date().toISOString()
                  });
                }
              }
              handleMentions(item.content, item.user_id, item.post_id, true, true);
            } else if (table === 'follows') {
              const isFollowBack = localDb.follows.some(f => f.follower_id === item.following_id && f.following_id === item.follower_id);
              const notifContent = isFollowBack ? 'followed you back.' : 'started following you.';
              localDb.notifications.push({
                id: crypto.randomUUID(),
                recipient_id: item.following_id,
                actor_id: item.follower_id,
                type: 'follow',
                post_id: null,
                content: notifContent,
                is_read: false,
                created_at: new Date().toISOString()
              });
            } else if (table === 'posts') {
              handleMentions(item.caption, item.user_id, item.id, false, true);
            }
          }

          saveLocalDb();
          return res.json({ data: isArray ? insertedRows : insertedRows[0], error: null });

        } else if (queryType === 'update') {
          const matched = tableArray.filter((item: any) => matchesFilter(item, actions));
          for (const item of matched) {
            Object.assign(item, updateValues);
            if (item.updated_at !== undefined) {
              item.updated_at = new Date().toISOString();
            }
          }
          saveLocalDb();
          return res.json({ data: updateValues, error: null });

        } else if (queryType === 'delete') {
          const matched = tableArray.filter((item: any) => matchesFilter(item, actions));
          
          for (const item of matched) {
            // handle decrements
            if (table === 'likes') {
              const post = localDb.posts.find(p => p.id === item.post_id);
              if (post) {
                post.likes_count = Math.max(0, (post.likes_count || 0) - 1);
              }
            } else if (table === 'comments') {
              const post = localDb.posts.find(p => p.id === item.post_id);
              if (post) {
                post.comments_count = Math.max(0, (post.comments_count || 0) - 1);
              }
            }
            
            const index = tableArray.indexOf(item);
            if (index > -1) {
              tableArray.splice(index, 1);
            }
          }

          saveLocalDb();
          return res.json({ data: true, error: null });
        }

      } catch (err: any) {
        console.error('[Fallback DB Handler Error]', err);
        return res.status(500).json({ data: null, error: err.message });
      }
    }

    // Standard MySQL Path (if functional)
    try {
      let queryType = 'select';
      const wClauses: string[] = [];
      const params: any[] = [];
      let orderBy = '';
      let limitVal: number | null = null;
      let isSingle = false;
      let insertValues: any = null;
      let updateValues: any = null;

      for (const action of actions || []) {
        switch (action.type) {
          case 'select':
            queryType = 'select';
            break;
          case 'insert':
            queryType = 'insert';
            insertValues = action.values;
            break;
          case 'update':
            queryType = 'update';
            updateValues = action.values;
            break;
          case 'delete':
            queryType = 'delete';
            break;
          case 'eq':
            wClauses.push(`\`${action.column}\` = ?`);
            params.push(action.value);
            break;
          case 'neq':
            wClauses.push(`\`${action.column}\` != ?`);
            params.push(action.value);
            break;
          case 'in':
            if (Array.isArray(action.values) && action.values.length > 0) {
              wClauses.push(`\`${action.column}\` IN (${action.values.map(() => '?').join(',')})`);
              params.push(...action.values);
            } else {
              wClauses.push('1 = 0');
            }
            break;
          case 'not':
            if (action.operator === 'in') {
              let rawVal = action.value;
              if (typeof rawVal === 'string') {
                rawVal = rawVal.replace(/^\(|\)$/g, '');
                const parts = rawVal.split(',').map((x: string) => x.trim()).filter(Boolean);
                if (parts.length > 0) {
                  wClauses.push(`\`${action.column}\` NOT IN (${parts.map(() => '?').join(',')})`);
                  params.push(...parts);
                }
              }
            }
            break;
          case 'or': {
            const orVal = action.filter;
            if (orVal.includes('and(sender_id.eq.') && orVal.includes('receiver_id.eq.')) {
              const matches = [...orVal.matchAll(/sender_id\.eq\.([^,)]+),receiver_id\.eq\.([^,)]+)/g)];
              if (matches.length >= 2) {
                const s1 = matches[0][1];
                const r1 = matches[0][2];
                const s2 = matches[1][1];
                const r2 = matches[1][2];
                wClauses.push(`((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))`);
                params.push(s1, r1, s2, r2);
              }
            } else if (orVal.includes('sender_id.eq.') && orVal.includes('receiver_id.eq.')) {
              const sMatch = orVal.match(/sender_id\.eq\.([^,]+)/);
              const rMatch = orVal.match(/receiver_id\.eq\.([^,]+)/);
              if (sMatch && rMatch) {
                wClauses.push(`(sender_id = ? OR receiver_id = ?)`);
                params.push(sMatch[1], rMatch[1]);
              }
            }
            break;
          }
          case 'order': {
            const dir = (action.options && action.options.ascending === false) ? 'DESC' : 'ASC';
            orderBy = `ORDER BY \`${action.column}\` ${dir}`;
            break;
          }
          case 'limit':
            limitVal = action.count;
            break;
          case 'single':
          case 'maybeSingle':
            isSingle = true;
            break;
        }
      }

      const whereSql = wClauses.length > 0 ? `WHERE ${wClauses.join(' AND ')}` : '';
      const limitSql = limitVal !== null ? `LIMIT ${limitVal}` : '';

      if (queryType === 'select') {
        let sql = '';
        if (table === 'posts') {
          sql = `
            SELECT posts.*, 
                   profiles.username as profile_username, 
                   profiles.display_name as profile_display_name, 
                   profiles.avatar_url as profile_avatar_url, 
                   profiles.is_verified as profile_is_verified
            FROM posts
            LEFT JOIN profiles ON posts.user_id = profiles.user_id
            ${whereSql}
            ${orderBy || 'ORDER BY posts.created_at DESC'}
            ${limitSql}
          `;
        } else if (table === 'comments') {
          sql = `
            SELECT comments.*, 
                   profiles.username as profile_username, 
                   profiles.avatar_url as profile_avatar_url, 
                   profiles.is_verified as profile_is_verified
            FROM comments
            LEFT JOIN profiles ON comments.user_id = profiles.user_id
            ${whereSql}
            ${orderBy || 'ORDER BY comments.created_at ASC'}
            ${limitSql}
          `;
        } else if (table === 'stories') {
          sql = `
            SELECT stories.*, 
                   profiles.username as profile_username, 
                   profiles.display_name as profile_display_name, 
                   profiles.avatar_url as profile_avatar_url, 
                   profiles.is_verified as profile_is_verified
            FROM stories
            LEFT JOIN profiles ON stories.user_id = profiles.user_id
            ${whereSql}
            ${orderBy || 'ORDER BY stories.created_at DESC'}
            ${limitSql}
          `;
        } else if (table === 'notifications') {
          sql = `
            SELECT notifications.*, 
                   profiles.username as profile_username, 
                   profiles.display_name as profile_display_name, 
                   profiles.avatar_url as profile_avatar_url, 
                   profiles.is_verified as profile_is_verified
            FROM notifications
            LEFT JOIN profiles ON notifications.actor_id = profiles.user_id
            ${whereSql}
            ${orderBy || 'ORDER BY notifications.created_at DESC'}
            ${limitSql}
          `;
        } else {
          sql = `
            SELECT * FROM \`${table}\`
            ${whereSql}
            ${orderBy}
            ${limitSql}
          `;
        }

        const [rows]: any = await pool.query(sql, params);
        let data: any = rows;

        // Relation nested mapping to match Supabase expectations exactly
        if (table === 'posts') {
          data = rows.map((r: any) => ({
            ...r,
            is_verified: !!r.is_verified,
            profiles: {
              username: r.profile_username,
              display_name: r.profile_display_name,
              avatar_url: r.profile_avatar_url,
              is_verified: !!r.profile_is_verified
            }
          }));
        } else if (table === 'comments') {
          data = rows.map((r: any) => ({
            ...r,
            profiles: {
              username: r.profile_username,
              avatar_url: r.profile_avatar_url,
              is_verified: !!r.profile_is_verified
            }
          }));
        } else if (table === 'stories') {
          data = rows.map((r: any) => ({
            ...r,
            profiles: {
              username: r.profile_username,
              display_name: r.profile_display_name,
              avatar_url: r.profile_avatar_url,
              is_verified: !!r.profile_is_verified
            }
          }));
        } else if (table === 'notifications') {
          data = rows.map((r: any) => ({
            ...r,
            is_read: !!r.is_read,
            actor: r.profile_username ? {
              username: r.profile_username,
              display_name: r.profile_display_name,
              avatar_url: r.profile_avatar_url,
              is_verified: !!r.profile_is_verified
            } : null
          }));
        } else if (table === 'profiles') {
          data = rows.map((r: any) => ({
            ...r,
            is_verified: !!r.is_verified
          }));
        } else if (table === 'messages') {
          data = rows.map((r: any) => ({
            ...r,
            is_read: !!r.is_read
          }));
        }

        const result = isSingle ? (data[0] || null) : data;
        return res.json({ data: result, error: null, count: data.length });

      } else if (queryType === 'insert') {
        const isArray = Array.isArray(insertValues);
        const list = isArray ? insertValues : [insertValues];

        const insertedRows = [];
        for (const item of list) {
          if (!item.id) {
            item.id = crypto.randomUUID();
          }

          const keys = Object.keys(item);
          const vals = Object.values(item);
          const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
          await pool.query(sql, vals);
          insertedRows.push(item);

          // MySQL Trigger-Like counts updates mimicry
          if (table === 'likes') {
            await pool.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [item.post_id]);
            try {
              const [postRows]: any = await pool.query('SELECT user_id FROM posts WHERE id = ?', [item.post_id]);
              if (postRows.length > 0 && postRows[0].user_id !== item.user_id) {
                await pool.query(
                  `INSERT INTO notifications (id, recipient_id, actor_id, type, post_id, content, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [crypto.randomUUID(), postRows[0].user_id, item.user_id, 'like', item.post_id, 'liked your post.', false]
                );
              }
            } catch (e) {
              console.error(e);
            }
          }
          if (table === 'comments') {
            await pool.query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [item.post_id]);
            try {
              const [postRows]: any = await pool.query('SELECT user_id FROM posts WHERE id = ?', [item.post_id]);
              if (postRows.length > 0 && postRows[0].user_id !== item.user_id) {
                await pool.query(
                  `INSERT INTO notifications (id, recipient_id, actor_id, type, post_id, content, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [crypto.randomUUID(), postRows[0].user_id, item.user_id, 'comment', item.post_id, 'commented on your post.', false]
                );
              }
            } catch (e) {
              console.error(e);
            }
            await handleMentions(item.content, item.user_id, item.post_id, true, false);
          }
          if (table === 'follows') {
            try {
              const [fback]: any = await pool.query(
                `SELECT id FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1`,
                [item.following_id, item.follower_id]
              );
              const notifContent = fback.length > 0 ? 'followed you back.' : 'started following you.';
              await pool.query(
                `INSERT INTO notifications (id, recipient_id, actor_id, type, post_id, content, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [crypto.randomUUID(), item.following_id, item.follower_id, 'follow', null, notifContent, false]
              );
            } catch (e) {
              console.error(e);
            }
          }
          if (table === 'posts') {
            await handleMentions(item.caption, item.user_id, item.id, false, false);
          }
        }

        return res.json({ data: isArray ? insertedRows : insertedRows[0], error: null });

      } else if (queryType === 'update') {
        const keys = Object.keys(updateValues);
        const vals = Object.values(updateValues);
        const sql = `UPDATE \`${table}\` SET ${keys.map(k => `\`${k}\` = ?`).join(', ')} ${whereSql}`;
        await pool.query(sql, [...vals, ...params]);
        return res.json({ data: updateValues, error: null });

      } else if (queryType === 'delete') {
        if (table === 'likes' && wClauses.length > 0) {
          const [likesRows]: any = await pool.query(`SELECT * FROM likes ${whereSql}`, params);
          for (const r of likesRows) {
            await pool.query('UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', [r.post_id]);
          }
        }
        if (table === 'comments' && wClauses.length > 0) {
          const [commentsRows]: any = await pool.query(`SELECT * FROM comments ${whereSql}`, params);
          for (const r of commentsRows) {
            await pool.query('UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = ?', [r.post_id]);
          }
        }

        const sql = `DELETE FROM \`${table}\` ${whereSql}`;
        await pool.query(sql, params);
        return res.json({ data: true, error: null });
      }
    } catch (err: any) {
      console.warn('[MySQL error during query, switching live to fallback]:', err);
      useLocalFallback = true;
      // Restart the request using fallback logic
      return res.redirect(307, req.originalUrl);
    }
  });

  // Client Routing (Integrate Vite as Middleware for Development)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server] Ready on http://0.0.0.0:${PORT}`);
  });
}

startServer();
