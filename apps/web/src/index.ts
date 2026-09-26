import { createServer } from "node:http";

const PORT = Number(process.env["PORT"] ?? 3000);

// Placeholder server until Next.js is scaffolded in I1. It exists so the container,
// compose stack, and health checks are real rather than theoretical.
const server = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "web" }));
    return;
  }

  if (req.url === "/readyz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ready", service: "web" }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, () => {
  process.stdout.write(`web listening on ${PORT}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
