import { toSolidStartHandler } from "better-auth/solid-start";
import type { Auth } from "better-auth";
import { auth } from "../../../lib/auth";

function makeHandler(method: string) {
  return async (event: { request: Request }) => {
    if (!auth) {
      return new Response("Authentication is not configured", { status: 500 });
    }
    const handlers = toSolidStartHandler(auth as Auth);
    const h = method === "GET" ? handlers.GET : handlers.POST;
    return h(event);
  };
}

export const GET = makeHandler("GET");
export const POST = makeHandler("POST");