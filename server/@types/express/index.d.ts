import { UserAccount } from "../../middlewares/authentication";

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
          user: string | UserAccount | undefined;
        }
      | undefined;
  }
}
