import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
import authRouter from "./routes/auth";
import sourcesRouter from "./routes/sources";
import browseractRouter from "./routes/browseract";
import eventsRouter from "./routes/events";
import promptsRouter from "./routes/prompts";
import newslettersRouter from "./routes/newsletters";
import templatesRouter from "./routes/templates";
import usersRouter from "./routes/users";
import settingsRouter from "./routes/settings";
import dashboardRouter from "./routes/dashboard";
import errorLogsRouter from "./routes/errorLogs";
import healthRouter from "./routes/health";

const app: Express = express();

const PgSession = connectPgSimple(session);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new PgSession({ pool, tableName: "session" }),
  secret: process.env.SESSION_SECRET || "varese-life-secret-change-me",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  },
}));

app.use("/api", healthRouter);
app.use("/api", authRouter);
app.use("/api", sourcesRouter);
app.use("/api", browseractRouter);
app.use("/api", eventsRouter);
app.use("/api", promptsRouter);
app.use("/api", newslettersRouter);
app.use("/api", templatesRouter);
app.use("/api", usersRouter);
app.use("/api", settingsRouter);
app.use("/api", dashboardRouter);
app.use("/api", errorLogsRouter);

export default app;
