import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { HTTPException } from "https://deno.land/x/hono@v3.12.10/http-exception.ts";

const app = new Hono();
const kv = await Deno.openKv();

// Helper to turn path into clean array: /py4e/abc -> ["py4e", "abc"]
function getCleanKey(keyParam: string): string[] {
  return keyParam.split('/').filter(p => p.length > 0);
}

app.post("/kv/set/:key{.*}", async (c) => {
  checkToken(c);
  const key = getCleanKey(c.req.param("key"));
  const body = await c.req.json();
  const result = await kv.set(key, body);
  return c.json(result);
});

app.get("/kv/get/:key{.*}", async (c) => {
  checkToken(c);
  const key = getCleanKey(c.req.param("key"));
  const result = await kv.get(key);
  return c.json(result);
});

app.all("/dump", async (c) => {
  return c.json({
    method: c.req.method,
    url: c.req.url,
    path: c.req.path,
    headers: Object.fromEntries(c.req.raw.headers),
    query: c.req.query(),
    body: ""
  });
});

function checkToken(c) {
  const token = c.req.query("token");
  if (token === "2604_8461e8:cebb65") return true;
  throw new HTTPException(401, { message: "Missing or invalid token" });
}

Deno.serve(app.fetch);
