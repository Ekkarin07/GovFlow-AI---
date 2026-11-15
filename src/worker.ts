
import {
  readSessionCookie,
  getSessionUser
} from "./server/auth";

import { handleLogin } from "./server/login";

}
interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  LOGIN_RATE_LIMITER: RateLimit;
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url = new URL(request.url);

    // Test database connectivity
    if (url.pathname === "/health") {
      const result = await env.DB
        .prepare("SELECT 1 AS ok")
        .first<{ ok: number }>();

      return Response.json({
        status: result?.ok === 1 ? "ok" : "error",
        service: "GovFlow AI",
        database:
          result?.ok === 1 ? "connected" : "error"
      });
    }

    // Login API
    if (url.pathname === "/api/v1/auth/login") {
      return handleLogin(request, env.DB);
    }

    // Check authenticated user
    if (
      url.pathname === "/api/v1/me" &&
      request.method === "GET"
    ) {
      const token = readSessionCookie(request);

      if (!token) {
        return Response.json(
          { error: "Unauthorized" },
          {
            status: 401,
            headers: { "Cache-Control": "no-store" }
          }
        );
      }

      const user = await getSessionUser(
        env.DB,
        token
      );

      if (!user) {
        return Response.json(
          { error: "Invalid or expired session" },
          {
            status: 401,
            headers: { "Cache-Control": "no-store" }
          }
        );
      }

      return Response.json(
        { user },
        {
          headers: { "Cache-Control": "no-store" }
        }
      );
    }

    // Other APIs are not enabled yet
    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          error: {
            messageTh: "ระบบ API อยู่ระหว่างปรับปรุง"
          }
        },
        { status: 503 }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
