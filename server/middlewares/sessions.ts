import { randomBytes } from "crypto";
import expressSession from "express-session";
import createMemoryStore from "memorystore";

export function sessions() {
  const kSessionSecret = randomBytes(16).toString("hex");
  const MemoryStore = createMemoryStore(expressSession);

  return expressSession({
    name: "knockknock-sess",
    secret: kSessionSecret,
    cookie: {
      secure: true,
      httpOnly: true,
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 3, // 3 days
    },
    resave: false,
    rolling: true,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  });
}
