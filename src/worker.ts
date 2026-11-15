
interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      const result = await env.DB
        .prepare("SELECT 1 AS ok")
        .first<{ ok: number }>();

      return Response.json({
        status: result?.ok === 1 ? "ok" : "error",
        service: "GovFlow AI",
        database: result?.ok === 1 ? "connected" : "error"
      });
    }

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
