import type { Request, Response } from "express";
import { createNeonApp } from "../server/_core/app";

let neonAppPromise: ReturnType<typeof createNeonApp> | undefined;

/** Vercel serverless adapter for every Neon API route. */
export default async function handler(req: Request, res: Response) {
  neonAppPromise ??= createNeonApp();
  const app = await neonAppPromise;
  return app(req, res);
}
