import { type ComplaintIntakeEnv, handleComplaintIntake } from "./complaint-intake";

export default {
  fetch(request: Request, env?: ComplaintIntakeEnv): Response | Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/api/health") {
      if (request.method !== "GET") {
        return Response.json(
          { error: "Method not allowed" },
          { status: 405, headers: { Allow: "GET" } },
        );
      }
      return Response.json({ status: "ok" });
    }
    if (path === "/api/complaints")
      return handleComplaintIntake(request, env as ComplaintIntakeEnv);
    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
