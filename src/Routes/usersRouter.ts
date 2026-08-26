import { type Request, type Response, Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/all_users", async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json({"users": users});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}); 

export default router;
