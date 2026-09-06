import { type Request, type Response, Router } from "express";
import { Prisma } from "../generated/prisma/client";
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
    const { username } = req.body;
    if (typeof username !== "string" || username.trim().length === 0) {
        return res.status(400).json({ error: "username is required" });
    }

    try {
        // Find the current user based on their auth ID
        const currentUser = await prisma.user.findUnique({
            where: { authId: req.supabaseUser.id }
        });
        if (!currentUser) return res.status(404).json({ error: "User not synced" });

        // can't do case-insensitive matching).
        const addressee = await prisma.user.findFirst({
            where: { username: { equals: username.trim(), mode: "insensitive" } }
        });
        if (!addressee) return res.status(404).json({ error: "No user with that username" });
        if (addressee.id === currentUser.id) {
            return res.status(400).json({ error: "Cannot send friend request to yourself" });
        }

        // A friendship row may be stored in either direction — block both
        const existing = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: currentUser.id, addresseeId: addressee.id },
                    { requesterId: addressee.id, addresseeId: currentUser.id }
                ]
            }
        });
        if (existing) return res.status(409).json({ error: "Friendship already exists" });

        const friendship = await prisma.friendship.create({
            data: {
                requesterId: currentUser.id,
                addresseeId: addressee.id
            }
        });
        res.status(201).json(friendship);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return res.status(409).json({ error: "Request already exists" });
        }
        console.error("POST /send_request failed:", error);
        res.status(500).json({ error: "Failed to send friend request" });
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

// Get the friendship ID between the current user and a specified friend by username
router.get("/get_friendship_id", requireAuth, async (req: Request, res: Response) => {
    try {
        const currentUser = await prisma.user.findUnique({
            where: { authId: req.supabaseUser!.id }
        });

        if (!currentUser) return res.status(404).json({ error: "User not synced" });

        const { username } = req.query;
        if (typeof username !== "string" || username.trim().length === 0) {
        return res.status(400).json({ error: "username is required" });
        }

        const friend = await prisma.user.findFirst({
            where: {username: { equals: username.trim() }}
        });

        if (!friend) {
            return res.status(404).json({ error: "Friend not found" });
        }

        const friendship = await prisma.friendship.findFirst({
            where: {
                status: "ACCEPTED", // Only consider accepted friendships
                OR: [ // (requesterId = me AND addresseeId = friend) OR (requesterId = friend AND addresseeId = me) 
                { requesterId: currentUser.id, addresseeId: friend.id },
                { requesterId: friend.id, addresseeId: currentUser.id },
                ],
            }
        });

        if (!friendship) {
            return res.status(404).json({ error: "Friendship not found" });
        }

        res.status(200).json({ friendshipId: friendship.id });

    } catch (error) {
        console.error("GET /get_friendship_id failed:", error);
        res.status(500).json({ error: `Failed to get friendship id with error: ${error}` });
    }
});


export default router;