-- Referans şema: uygulama açılışında IF NOT EXISTS ile oluşturulur.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS api_keys(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),name TEXT,secret_hash TEXT UNIQUE,capacity INTEGER,tokens REAL,updated INTEGER,active INTEGER DEFAULT 1);
 CREATE TABLE IF NOT EXISTS requests(id INTEGER PRIMARY KEY,key_id TEXT REFERENCES api_keys(id),status INTEGER,at TEXT);
