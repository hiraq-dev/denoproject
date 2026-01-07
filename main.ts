import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { HTTPException } from "https://deno.land/x/hono@v3.12.10/http-exception.ts";

const app = new Hono();
const kv = await Deno.openKv();

/* =========================
   KEY NORMALIZATION (SAFE)
   ========================= */
function normalizeKey(key: string): string[] {
  const parts = key.split('/');

  // Only normalize PY4E keys (Coursera requirement)
  if (
    parts.length === 2 &&
    parts[0] === "py4e" &&
    !parts[1].startsWith("chapter01_")
  ) {
    parts[1] = "chapter01_" + parts[1];
  }

  return parts;
}

/* =========================
   SET
   ========================= */
app.post("/kv/set/:key{.*}", async (c) => {
  checkToken(c);
  const key = c.req.param("key");
  const body = await c.req.json();

  const fixedKey = normalizeKey(key);
  const result = await kv.set(fixedKey, body);

  return c.json(result);
});

/* =========================
   GET
   ========================= */
app.get("/kv/get/:key{.*}", async (c) => {
  checkToken(c);
  const key = c.req.param("key");

  const fixedKey = normalizeKey(key);
  const result = await kv.get(fixedKey);

  return c.json(result);
});

/* =========================
   LIST
   ========================= */
app.get("/kv/list/:key{.*}", async (c) => {
  checkToken(c);
  const key = c.req.param("key");
  const cursor = c.req.query("cursor");

  const prefix = normalizeKey(key);
  const options: any = { limit: 100 };
  if (cursor) options.cursor = cursor;

  const iter = await kv.list({ prefix }, options);
  const records = [];
  for await (const entry of iter) {
    records.push(entry);
  }

  return c.json({ records, cursor: iter.cursor });
});

/* =========================
   DELETE
   ========================= */
app.delete("/kv/delete/:key{.*}", async (c) => {
  checkToken(c);
  const key = c.req.param("key");

  const fixedKey = normalizeKey(key);
  const result = await kv.delete(fixedKey);

  return c.json(result);
});

/* =========================
   DELETE PREFIX
   ========================= */
app.delete("/kv/delete_prefix/:key{.*}", async (c) => {
  checkToken(c);
  const key = c.req.param("key");

  const prefix = normalizeKey(key);
  const iter = await kv.list({ prefix });
  const keys = [];

  for await (const entry of iter) {
    await kv.delete(entry.key);
    keys.push(entry.key);
  }

  return c.json({ keys });
});

/* =========================
   FULL RESET
   ========================= */
app.delete("/kv/full_reset_42", async (c) => {
  checkToken(c);
  const iter = await kv.list({ prefix: [] });
  const keys = [];

  for await (const entry of iter) {
    await kv.delete(entry.key);
    keys.push(entry.key);
  }

  return c.json({ keys });
});

/* =========================
   DUMP (BOTH ROUTES)
   ========================= */
async function dumpHandler(c) {
  const req = c.req;

  let body = "";
  try {
    body = await req.json();
  } catch {
    try {
      body = await req.text();
    } catch {}
  }

  return c.json({
    method: req.method,
    url: req.url,
    path: req.path,
    headers: Object.fromEntries(req.raw.headers),
    query: req.query(),
    body
  });
}

app.all("/dump", dumpHandler);
app.all("/dump/*", dumpHandler);

/* =========================
   ERROR HANDLING
   ========================= */
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  return c.json({ error: "Internal Server Error" }, 500);
});

/* =========================
   TOKEN CHECK
   ========================= */
function checkToken(c) {
  const token = c.req.query("token");
  if (token === "2604_8461e8:cebb65") return true;
  throw new HTTPException(401, { message: "Missing or invalid token" });
}

Deno.serve(app.fetch);
