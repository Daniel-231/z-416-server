import { type Request, type Response, Router } from "express";
import { requireAuth }from "../Middleware/requireAuth";
import { prisma } from "../lib/prisma";
import { getIO } from "../socket/socket";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { authId: req.supabaseUser.id }, select: { id: true, username: true, email: true, createdAt: true },
  });

  if (!user) return res.status(404).json({ error: "User not found" });
  res.status(200).json(user);
});


router.delete("/me", requireAuth, async (req: Request, res: Response) => {
  const authId = req.supabaseUser.id;
  const user = await prisma.user.findUnique({ where: { authId } });

  if (user) {
    // All or nothing: either everything is deleted, or nothing is
    await prisma.$transaction([
      prisma.locationShare.deleteMany({
        where: { OR: [{ requesterId: user.id }, { sharerId: user.id }] },
      }),
      prisma.friendship.deleteMany({
        where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
      }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    // Kick any open sockets so nothing keeps streaming
    getIO().in(`user:${user.id}`).disconnectSockets(true);
  }

  // Delete the login itself (needs the service-role client)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(authId);
  if (error) {
    console.error("Supabase deleteUser failed:", error);
    return res.status(500).json({ error: "Failed to delete login account" });
  }

  res.status(204).send();
});
export default router;
