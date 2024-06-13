import { timingSafeEqual } from "crypto";
import { NextFunction, Request, Response, Router } from "express";
import nconf from "nconf";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

export const kUrlLoginPage = "/auth/login";
export const kUrlLogoutPage = "/auth/logout";
export const kUrlWelcomePage = "/knockknock";

type Credential = { username: string; password: string };

const kCredentials = Object.freeze((nconf.get("credentials") as Array<Credential>).map((el) => Object.freeze(el)));

type AuthenticateCallback = (
  err: unknown,
  user: Express.User | false | null | undefined,
  info: { message: string } | undefined
) => void;

export type UserAccount = {
  username: string;
};

function checkCredential(username: string, password: string, credential: Credential): boolean {
  return (
    credential.username === username &&
    timingSafeEqual(Buffer.from(credential.password, "utf8"), Buffer.from(password, "utf8"))
  );
}

export function authentication() {
  // Load the Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async function (username, password, done) {
        try {
          const user = kCredentials.find((credential) => checkCredential(username, password, credential));
          if (user === undefined) {
            return done(null, false, {
              message: "Vous n’êtes pas autorisé à accéder à ce site.",
            });
          }

          done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // Add serializers
  passport.serializeUser(function (user: UserAccount, done) {
    done(null, user.username);
  });
  passport.deserializeUser(async function (username: string, done) {
    try {
      return done(null, { username: username });
    } catch (err) {
      done(err, null);
    }
  });

  // Add authentication routes
  const router = Router();
  router.post(kUrlLoginPage, (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate("local", function (err, user, info) {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.render("login", {
          errors: { message: info?.message },
          fields: { email: req.body.email },
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        res.redirect(kUrlWelcomePage);
      });
    } as AuthenticateCallback)(req, res, next);
  });
  router.get(kUrlLogoutPage, (req: Request, res: Response, next: NextFunction): void => {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }

      res.redirect(kUrlLoginPage);
    });
  });
  router.get(kUrlLoginPage, async (_req: Request, res: Response): Promise<void> => {
    res.render("login", { errors: {}, fields: {} });
  });

  // Return the Passport Middleware
  return [
    passport.authenticate("session"),
    router,
    (_req: Request, _res: Response, next: NextFunction): void => {
      next();
    },
  ];
}
