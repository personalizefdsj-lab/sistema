import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import type { Express, Request } from "express";

const PgStore = connectPgSimple(session);

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      name: string;
      role: string;
      companyId: number | null;
      permissions: string[] | null;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setupAuth(app: Express) {
  const sessionStore = new PgStore({
    pool: pool,
    createTableIfMissing: true,
    tableName: "session",
  });

  app.set("trust proxy", 1);

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "gestor-pedidos-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Credenciais inválidas" });
        }
        const valid = await comparePassword(password, user.password);
        if (!valid) {
          return done(null, false, { message: "Credenciais inválidas" });
        }
        if (user.role !== "superadmin" && user.companyId) {
          const company = await storage.getCompany(user.companyId);
          if (company && company.status !== "active") {
            return done(null, false, { message: "Empresa suspensa" });
          }
        }
        return done(null, {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          permissions: user.permissions as string[] | null,
        });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(null, false);
      done(null, {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        permissions: user.permissions as string[] | null,
      });
    } catch (err) {
      done(err);
    }
  });
}

export function requireAuth(req: Request, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function requireSuperAdmin(req: Request, res: any, next: any) {
  if (!req.isAuthenticated() || req.user?.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

export function requirePermission(permission: string) {
  return (req: Request, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user!;
    if (user.role === "superadmin" || user.role === "admin") {
      return next();
    }
    const perms = user.permissions as string[] | null;
    if (perms && perms.includes(permission)) {
      return next();
    }
    return res.status(403).json({ message: "Permissão insuficiente" });
  };
}
