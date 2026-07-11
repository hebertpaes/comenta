// Health check do site — usado por load balancers, uptime e Docker healthcheck.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    service: "comenta-site",
    timestamp: new Date().toISOString(),
  });
}
