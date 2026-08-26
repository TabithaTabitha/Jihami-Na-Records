import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();
const upstreamOrigin = "https://jihami.co.ke";
const bodylessMethods = new Set(["GET", "HEAD"]);

function buildUpstreamBody(req: Request): string | undefined {
  if (bodylessMethods.has(req.method)) return undefined;

  if (req.is("application/json")) {
    return JSON.stringify(req.body ?? {});
  }

  if (req.is("application/x-www-form-urlencoded")) {
    return new URLSearchParams(req.body ?? {}).toString();
  }

  return undefined;
}

router.use(async (req, res: Response) => {
  const upstreamUrl = new URL(req.originalUrl, upstreamOrigin);
  const authorization = req.get("authorization");
  const contentType = req.get("content-type");
  const body = buildUpstreamBody(req);
  const headers: Record<string, string> = {
    accept: req.get("accept") || "application/json",
  };

  if (authorization) headers.authorization = authorization;
  if (contentType && body !== undefined) headers["content-type"] = contentType;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    const responseContentType = upstreamResponse.headers.get("content-type");

    if (responseContentType) {
      res.setHeader("content-type", responseContentType);
    }

    res.status(upstreamResponse.status).send(responseBody);
  } catch (error) {
    req.log.error({ err: error, upstreamUrl: upstreamUrl.toString() }, "Jihami API proxy request failed");
    res.status(502).json({
      success: false,
      message: "Unable to reach the Jihami API",
    });
  }
});

export default router;