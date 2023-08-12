import { randomBytes } from "crypto";
import expressSession from "express-session";
import createMemoryStore from "memorystore";

export function sessions() {
  const kSessionSecret = randomBytes(16).toString("hex");
  const MemoryStore = createMemoryStore(expressSession);

  return expressSession({
    name: "linkopedia-sess",
    secret: kSessionSecret,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 3, // 3 days
      path: "/",
      httpOnly: true,
    },
    resave: false,
    rolling: true,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  });
}
