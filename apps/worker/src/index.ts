import { createServer } from "node:http";

const PORT = Number(process.env["WORKER_PORT"] ?? 3001);

// Placeholder until the pgmq consumer lands. The health endpoint is what compose and
// Cloud Run probe, so it ships now rather than later.
const server = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "worker" }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, () => {
  process.stdout.write(`worker listening on ${PORT}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
