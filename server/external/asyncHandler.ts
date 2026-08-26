import type { ErrorRequestHandler, Express, RequestHandler } from "express";

export function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function installAsyncRouteGuards(app: Express) {
  for (const method of ["get", "post", "put", "patch", "delete", "all"] as const) {
    const original: any = app[method].bind(app);
    (app as any)[method] = (path: unknown, ...handlers: unknown[]) => {
      const guardedHandlers = handlers.map((handler) => {
        if (typeof handler !== "function") return handler;
        return handler.constructor?.name === "AsyncFunction" ? asyncRoute(handler as RequestHandler) : handler;
      });
      return original(path as any, ...guardedHandlers);
    };
  }
}

export const independentErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("[Independent API Error]", error);
  return res.status(500).json({ error: "تعذر إكمال الطلب الآن. حاول لاحقاً." });
};
