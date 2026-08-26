import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../Middleware/requireAuth";

const router = Router();

router.post("/sync", requireAuth, async (req: Request, res: Response) => { // Sync Supabase User With SQL User
  const supaUser = req.supabaseUser!;

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
      username: `${supaUser.email!.split("@")[0]}-${supaUser.id.slice(0, 6)}`,
    },
  });

  res.json(user);
  } catch (error) {
    console.error(error);
    console.log("Failed To Sync User With Error:", error);
  }
});

export default router;
