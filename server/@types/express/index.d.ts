import { UserAccount } from "../../interfaces/index.js";

export {};

declare global {
  namespace Express {
    export interface Request {
      _startTime: number;
    }

    export interface Response {
      responseTimeMs: number;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    export interface User extends UserAccount {}
  }
}

declare module "express-session" {
  interface SessionData {
    passport:
      | {
          user: UserAccount | string | undefined;
        }
      | undefined;
  }
}
