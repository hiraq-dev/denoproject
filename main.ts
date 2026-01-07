import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { HTTPException } from "https://deno.land/x/hono@v3.12.10/http-exception.ts";

const app = new Hono();
const kv = await Deno.openKv();

// Set a record by key
app.post("/kv/set/:key{.*}", async (c) => {
  checkToken(c);
  // Remove leading/trailing slashes to ensure the key array is clean
  const keyPath = c.req.param("key").replace(/^\/|\/$/g, "");
  const body = await c.req.json();
  const result = await kv.set(keyPath.split('/'), body);
  return c.json(result);
});

// Get a record by key
app.get("/kv/get/:key{.*}", async (c) => {
  checkToken(c);
  const keyPath = c.req.param("key").replace(/^\/|\/$/g, "");
  const result = await kv.get(keyPath.split('/'));
  return c.json(result);
});

// List records with a key prefix
app.get("/kv/list/:key{.*}", async (c) => {
  checkToken(c);
  const keyPath = c.req.param("key").replace(/^\/|\/$/g, "");
  const options = { prefix: keyPath.split('/') };
  const iter = kv.list(options);
  const records = [];
  for await (const res of iter) records.push(res);
  return c.json({ records });
});

app.get("/dump/:key{.*}", async (c) => {
  return c.json({
    method: c.req.method,
    url: c.req.url,
    path: c.req.path,
    headers: c.req.header(),
    query: c.req.query()
  });
});

function checkToken(c) {
  const token = c.req.query("token");
  if (token === '2604_8461e8:cebb65') return true;
  throw new HTTPException(401, { message: 'Missing or invalid token' });
}

Deno.serve(app.fetch);
