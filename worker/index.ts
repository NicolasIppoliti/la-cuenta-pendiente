export default {
  fetch(request: Request): Response {
    if (new URL(request.url).pathname === "/api/health") {
      if (request.method !== "GET") {
        return Response.json(
          { error: "Method not allowed" },
          { status: 405, headers: { Allow: "GET" } },
        );
      }
      return Response.json({ status: "ok" });
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
