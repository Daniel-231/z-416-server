import { type Request, type Response, Router } from "express";
import { requireAuth }from "../Middleware/requireAuth";
import { prisma } from "../lib/prisma";


const router = Router();


router.get("/all_friends", requireAuth, async (req: Request, res: Response) => {
    try {
        const currentUser = await prisma.user.findUnique({ // find the current user based on their auth ID
            where: { authId: req.supabaseUser.id },
        });

        if (!currentUser) return res.status(404).json({ error: "User not synced" });

        const friendships = await prisma.friendship.findMany({
            where: {
                status: "ACCEPTED", // only include friendships that have been accepted
                OR: [
                    { requesterId: currentUser.id }, // option 1: my id is in the requester column
                    { addresseeId: currentUser.id } // option 2: my id is in the addressee column
                ]
            },
            include: { // include details of both the requester and the addressee
                requester: { select: { id: true, username: true } },
                addressee: { select: { id: true, username: true } },
            }
        });

        const friends = friendships.map((f) => f.requesterId === currentUser.id ? f.addressee : f.requester); // extract the friend from each friendship
        res.status(200).json(friends);
    } catch (error) {
        console.error("GET /all_friends failed:", error);
        res.status(500).json({ error: "Failed to fetch friends" });
    }
});

router.get("/friend_requests", requireAuth, async (req: Request, res: Response) => {
    try {
        const currentUser = await prisma.user.findUnique({
            where: { authId: req.supabaseUser.id }
        });
        if (!currentUser) return res.status(404).json({ error: "User not synced" });

        const friendRequests = await prisma.friendship.findMany({
            where: {
                status: "PENDING",
                addresseeId: currentUser.id,   // <- only requests sent TO ME
            },
            include: {
                requester: { select: { id: true, username: true } },
            }, 
            orderBy: { createdAt: "desc" }
        });
        res.status(200).json(friendRequests);
    } catch (error) {
        console.error("GET /friend_requests failed:", error);
        res.status(500).json({ error: "Failed to fetch friend requests" });
    }
});

router.post("/send_request", requireAuth, async (req: Request, res: Response) => {
    const { addresseeId } = req.body;
    if (typeof addresseeId !== "string" || addresseeId.trim().length === 0) {
        return res.status(400).json({ error: "addresseeId is required" });
    }
    
    try {
        // Find the current user based on their auth ID
        const currentUser = await prisma.user.findUnique({
            where: { authId: req.supabaseUser!.id }
        });

        // Check if the user exists and is not trying to send a request to themselves
        if (!currentUser) return res.status(404).json({ error: "User not found" });
        if (currentUser.id === addresseeId) return res.status(400).json({ error: "Cannot send friend request to yourself" });

        const friendship = await prisma.friendship.create({
            data: {
                requesterId: currentUser.id,
                addresseeId: addresseeId
            }
        });
        res.status(201).json(friendship);
    } catch (error) {
        res.status(400).json({ error: "Request already exists or invalid IDs" });
    }
});

router.put("/:id/accept_request", requireAuth, async (req: Request, res: Response) => {
    try {
        const currentUser = await prisma.user.findUnique({
            where: { authId: req.supabaseUser!.id }
        });

        if (!currentUser) return res.status(404).json({ error: "User not synced" });

        const result = await prisma.friendship.updateMany({
            where: {
                id: req.params.id,
                addresseeId: currentUser.id, // must be the one who RECEIVED it
                status: "PENDING", // must not already be handled
            },

            data: { status: "ACCEPTED" }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: "No pending request with that id for you" });
        }

        const friendship = await prisma.friendship.findUnique({ where: { id: req.params.id } });
        res.status(200).json(friendship);

    } catch (error) {
        console.error("PUT /accept_request failed:", error);
         res.status(500).json({ error: "Failed to accept request" });
    }
});

router.put("/:id/decline_request", requireAuth, async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { authId: req.supabaseUser.id },
    });
    if (!currentUser) return res.status(404).json({ error: "User not synced" });

    const result = await prisma.friendship.deleteMany({
      where: {
        id: req.params.id,
        addresseeId: currentUser.id,
        status: "PENDING",
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "No pending request with that id for you" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("PUT /decline_request failed:", error);
    res.status(500).json({ error: "Failed to decline request" });
  }
});




export default router;