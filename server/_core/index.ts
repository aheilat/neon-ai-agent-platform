import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { serveStatic, setupVite } from "./vite";
import { isIndependentRuntime } from "../external/runtimeMode";

process.on("unhandledRejection", (reason) => {
  console.error("[Process] Unhandled promise rejection", reason);
});

let uncaughtExceptionShutdownScheduled = false;

process.on("uncaughtException", (error) => {
  console.error("[Process] Uncaught exception", error);
  if (uncaughtExceptionShutdownScheduled) return;
  uncaughtExceptionShutdownScheduled = true;
  setTimeout(() => process.exit(1), 100);
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = isIndependentRuntime()
    ? await (await import("../external/app")).createIndependentNeonApp()
    : await (await import("./app")).createNeonApp();
  const server = createServer(app);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
