import { type Request, type Response, Router } from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../Middleware/requireAuth";

const router = Router();

router.post("/sync", requireAuth, async (req: Request, res: Response) => { // Sync Supabase User With SQL User
  const supaUser = req.supabaseUser!;
  const username = req.body.username;

  if (typeof username !== "string" || username.trim().length === 0) {
    return res.status(400).json({ error: "Username is required" });
  }


  try {
    const user = await prisma.user.upsert({
    where: { authId: supaUser.id },
    update: { email: supaUser.email! },
    create: {
      authId: supaUser.id,
      email: supaUser.email!,
      authProvider: "EMAIL",
      // Supabase doesn't give you a username — derive a placeholder and let the
      // user set a real one later (schema requires it unique).
      username: username.trim()
    },
  });

  res.json(user);
  } catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return res.status(409).json({ error: "Username already taken" });
  }
  console.error("Failed to sync user:", error);
  return res.status(500).json({ error: "Failed to sync user" });
}
});

export default router;
