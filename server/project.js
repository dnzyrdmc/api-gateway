import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
export default async function ({
  db,
  app,
  router,
  run,
  get,
  all,
  tx,
  id,
  now,
  text,
  integer,
  required,
  fail,
  hash,
}) {
  db.exec(`CREATE TABLE IF NOT EXISTS api_keys(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),name TEXT,secret_hash TEXT UNIQUE,capacity INTEGER,tokens REAL,updated INTEGER,active INTEGER DEFAULT 1);
 CREATE TABLE IF NOT EXISTS requests(id INTEGER PRIMARY KEY,key_id TEXT REFERENCES api_keys(id),status INTEGER,at TEXT);`);
  const upstream = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        service: "local-demo-upstream",
        message: "Proxy üzerinden başarılı yanıt",
        at: now(),
      }),
    );
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  upstream.unref();
  const endpoint = `http://127.0.0.1:${upstream.address().port}`;
  router.get("/keys", (req, res) =>
    res.json(
      all(
        "SELECT id,name,capacity,active FROM api_keys WHERE owner=?",
        req.user.id,
      ),
    ),
  );
  router.post("/keys", (req, res) => {
    const kid = id(),
      secret = randomBytes(24).toString("base64url"),
      capacity = integer(req.body.capacity, 1, 100);
    run(
      "INSERT INTO api_keys VALUES(?,?,?,?,?,?,?,1)",
      kid,
      req.user.id,
      text(req.body.name),
      hash(secret),
      capacity,
      capacity,
      Date.now(),
    );
    res.status(201).json({ id: kid, secret });
  });
  router.delete("/keys/:id", (req, res) => {
    run(
      "UPDATE api_keys SET active=0 WHERE id=? AND owner=?",
      req.params.id,
      req.user.id,
    );
    res.json({ ok: true });
  });
  router.get("/requests", (req, res) =>
    res.json(
      all(
        "SELECT r.* FROM requests r JOIN api_keys k ON k.id=r.key_id WHERE k.owner=? ORDER BY r.id DESC LIMIT 100",
        req.user.id,
      ),
    ),
  );
  app.get("/gateway/demo", async (req, res) => {
    const secret = String(req.headers["x-api-key"] || "");
    const key = required(
      get(
        "SELECT * FROM api_keys WHERE secret_hash=? AND active=1",
        hash(secret),
      ),
    );
    const allowed = tx(() => {
      const k = get("SELECT * FROM api_keys WHERE id=?", key.id);
      const time = Date.now(),
        tokens = Math.min(k.capacity, k.tokens + (time - k.updated) / 1000);
      const ok = tokens >= 1;
      run(
        "UPDATE api_keys SET tokens=?,updated=? WHERE id=?",
        ok ? tokens - 1 : tokens,
        time,
        k.id,
      );
      return ok;
    });
    if (!allowed) {
      run(
        "INSERT INTO requests(key_id,status,at) VALUES(?,?,?)",
        key.id,
        429,
        now(),
      );
      res.set("Retry-After", "1");
      return res
        .status(429)
        .json({ error: "Kota doldu; saniyede 1 token yenilenir" });
    }
    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(2000),
      });
      const body = await response.json();
      run(
        "INSERT INTO requests(key_id,status,at) VALUES(?,?,?)",
        key.id,
        response.status,
        now(),
      );
      res.status(response.status).json(body);
    } catch {
      run(
        "INSERT INTO requests(key_id,status,at) VALUES(?,?,?)",
        key.id,
        502,
        now(),
      );
      res.status(502).json({ error: "Üst servis erişilemiyor" });
    }
  });
}
