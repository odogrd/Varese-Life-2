import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email e password richiesti" });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !user.active) {
    return res.status(401).json({ error: "Credenziali non valide" });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Credenziali non valide" });
  }
  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));
  req.session.userId = user.id;
  req.session.save(() => {
    res.json({ id: user.id, email: user.email, role: user.role, isSuperadmin: user.isSuperadmin });
  });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Disconnesso" });
  });
});

router.get("/auth/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Non autenticato" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user || !user.active) return res.status(401).json({ error: "Non autenticato" });
  res.json({ id: user.id, email: user.email, role: user.role, isSuperadmin: user.isSuperadmin });
});

export default router;
