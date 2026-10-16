#!/usr/bin/env node
// Ganter Lab MCP bundle bridge (S11, ADR 0019).
//
// Claude Desktop's custom-connector UI only accepts remote HTTPS MCP servers, so it
// cannot point at the app's loopback endpoint directly. A `.mcpb` bundle, however,
// installs a *stdio* server — this script — which Claude Desktop launches with the
// bundled Node runtime. It forwards JSON-RPC between Claude Desktop (stdio) and the
// app's loopback Streamable-HTTP endpoint, so installing the bundle is the one-click
// way to connect Claude Desktop to a running station.
//
// Usage: node bridge.mjs [endpoint]
//   endpoint defaults to GANTERLAB_MCP_URL or http://127.0.0.1:18181/mcp
//   (must match the port shown on the app's Agent page).

import process from "node:process";

const endpoint =
  process.argv[2] || process.env.GANTERLAB_MCP_URL || "http://127.0.0.1:18181/mcp";

// The Streamable-HTTP server assigns a session id on initialize; every later request
// must echo it back.
let sessionId = null;
// The client's own initialize message, replayed verbatim to rebuild a dropped session.
let initializeMessage = null;
// One re-handshake at a time, shared by every request that raced into the same 404.
let renegotiation = null;
let reinitCount = 0;

function writeMessage(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

// Answer a request with a JSON-RPC error. A notification has no id to answer on, so it
// only gets a stderr line (Claude Desktop journals the server's stderr) — stdout stays
// pure JSON-RPC.
function fail(message, code, text, data) {
  if (message.id === undefined) {
    process.stderr.write(`[ganter-lab] ${text}\n`);
    return;
  }
  writeMessage({
    jsonrpc: "2.0",
    id: message.id,
    error: data === undefined ? { code, message: text } : { code, message: text, data },
  });
}

// An error page can be a whole HTML document; keep enough to identify it.
function excerpt(body) {
  const text = body.trim();
  return text.length > 200 ? `${text.slice(0, 200)}...` : text;
}

// Parse an SSE body into the JSON-RPC messages carried on its `data:` lines.
function parseEventStream(text) {
  const messages = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("\n");
    if (data) {
      try {
        messages.push(JSON.parse(data));
      } catch {
        // A non-JSON keep-alive comment — ignore.
      }
    }
  }
  return messages;
}

// One POST: send the message, adopt any session id the server hands back, read the body.
async function send(message, session) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (session) {
    headers["Mcp-Session-Id"] = session;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(message),
  });

  const assigned = response.headers.get("mcp-session-id");
  if (assigned) {
    sessionId = assigned;
  }

  // 202 Accepted (notifications) / 204 carry no body.
  const body =
    response.status === 202 || response.status === 204 ? "" : await response.text();
  return { response, body };
}

// Streamable HTTP answers 404 for an unknown/expired session id (MCP spec); the SDK also
// refuses a stale one with 400 naming the header.
function isSessionGone(response, body) {
  return (
    response.status === 404 || (response.status === 400 && /session/i.test(body))
  );
}

// Rebuild a session after the app restarted (Velopack relaunches it on every update):
// replay the client's own initialize under a bridge-owned id — its response is ours to
// swallow, never the client's — then complete the handshake.
async function renegotiate() {
  if (!initializeMessage) {
    return null;
  }

  const probe = { ...initializeMessage, id: `ganter-bridge-reinit-${++reinitCount}` };
  try {
    const { response } = await send(probe, null);
    if (!response.ok || !sessionId) {
      return null;
    }
  } catch {
    // The station went down for good; the caller answers with the original failure.
    return null;
  }

  const fresh = sessionId;
  try {
    await send({ jsonrpc: "2.0", method: "notifications/initialized" }, fresh);
  } catch {
    // The server serves the replay anyway if it does not gate on the notification.
  }
  return fresh;
}

function renegotiateOnce() {
  if (!renegotiation) {
    renegotiation = renegotiate().finally(() => {
      renegotiation = null;
    });
  }
  return renegotiation;
}

async function forward(message) {
  // Remember the handshake so a dropped session can be rebuilt from it.
  if (message.method === "initialize") {
    initializeMessage = message;
  }

  const sent = sessionId;
  let result;
  try {
    result = await send(message, sent);
  } catch (err) {
    // The app is not running / agent access is off. Surface it as a JSON-RPC error
    // for requests (those carrying an id); drop it for notifications.
    fail(message, -32001, `Cannot reach Ganter Lab at ${endpoint}: ${err.message}`);
    return;
  }

  // The station restarted and dropped the session. Re-handshake ONCE and replay, so the
  // in-flight call is still served instead of every call failing until Claude Desktop
  // is restarted too.
  if (sent && isSessionGone(result.response, result.body)) {
    sessionId = null;
    // An initialize opens a session by itself; anything else needs a fresh one first.
    const ready =
      message.method === "initialize" || (await renegotiateOnce()) !== null;
    if (ready) {
      try {
        result = await send(message, sessionId);
      } catch (err) {
        fail(message, -32001, `Cannot reach Ganter Lab at ${endpoint}: ${err.message}`);
        return;
      }
    }
  }

  const { response, body } = result;
  if (!response.ok) {
    // Never leave a request unanswered: Claude Desktop waits on the id until it times out.
    fail(message, -32000, `Ganter Lab returned HTTP ${response.status}`, {
      status: response.status,
      body: excerpt(body),
    });
    return;
  }

  if (!body) {
    return;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    for (const msg of parseEventStream(body)) {
      writeMessage(msg);
    }
  } else {
    try {
      writeMessage(JSON.parse(body));
    } catch {
      // Non-JSON body on a 2xx — ignore rather than corrupt the stdout stream.
      process.stderr.write(`[ganter-lab] Ignored non-JSON response body\n`);
    }
  }
}

// Read newline-delimited JSON-RPC messages from stdin and forward each.
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (line.length === 0) {
      continue;
    }
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue; // skip a malformed line rather than crash the bridge
    }
    // Last resort: an unhandled rejection here would take the whole connector down and
    // leave the request unanswered — the exact failure this bridge exists to avoid.
    void forward(message).catch((err) =>
      fail(message, -32603, `Ganter Lab bridge failed: ${err.message}`));
  }
});

process.stdin.on("end", () => process.exit(0));
