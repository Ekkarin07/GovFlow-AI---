
import {
  verifyPassword,
  createSession,
  sessionCookie
} from "./auth";

interface LoginUser {
  id: string;
  email: string;
  password_hash: string;
}

export async function handleLogin(
  request: Request,
  db: D1Database
): Promise<Response> {
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json"
  };

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  }

  // Reject cross-origin browser requests
  const origin = request.headers.get("Origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers }
    );
  }

  if (
    !request.headers.get("Content-Type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return new Response(
      JSON.stringify({ error: "Unsupported media type" }),
      { status: 415, headers }
    );
  }

  const bodyText = await request.text();

  if (bodyText.length > 4096) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers }
    );
  }

  let body: unknown;

  try {
    body = JSON.parse(bodyText);
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    !("password" in body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers }
    );
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;

  if (
    email.length > 254 ||
    password.length > 1024 ||
    !email.includes("@")
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers }
    );
  }

  const user = await db.prepare(
    `SELECT id, email, password_hash
     FROM auth_users
     WHERE email = ?
       AND status = 'ACTIVE'
     LIMIT 1`
  ).bind(email).first<LoginUser>();

  const valid = user
    ? await verifyPassword(password, user.password_hash)
    : false;

  if (!valid || !user) {
    return new Response(
      JSON.stringify({
        error: "Invalid email or password"
      }),
      { status: 401, headers }
    );
  }

  const token = await createSession(db, user.id);

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        ...headers,
        "Set-Cookie": sessionCookie(token)
      }
    }
  );
}
