import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../Middleware/requireAuth";

import express, { Request, Response } from "express";

const router = express.Router();

router.post("/send-location-share", requireAuth, async (req: Request, res: Response) => {
    const { requesterId, sharerId } = req.body;
    if(!requesterId || !sharerId) {
        return res.status(400).json({ error: "Missing requesterId or sharerId" });
    }

    try {
        const locationShareRequest = await prisma.locationShare.create({
            data: {
                requesterId,
                sharerId,
                status: "REQUESTED",
                createdAt: new Date(),
            }
        });
        console.log(locationShareRequest);
        res.status(201).json(locationShareRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create location share request" });
    }
});

router.patch("/:id/accept", requireAuth, async (req: Request, res: Response) => {
    try {
        const currentUser = await prisma.user.findUnique({
            where: { authId: req.supabaseUser.id }
        });

        if (!currentUser) {
            return res.status(404).json({ error: "Current user not found" });
        }
    
        const result = await prisma.locationShare.updateMany({
            where: { id: req.params.id, sharerId: currentUser.id, status: "REQUESTED" },
            data: { status: "ACTIVE" }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: "No pending share with that id for you" });
        }

        const share = await prisma.locationShare.findUnique({ where: { id: req.params.id } });
        res.status(200).json(share);
    } catch (error) {
        console.error("PATCH /accept failed:", error);
        res.status(500).json({ error: "Failed to accept location share request" });
    }
});

router.patch("/:id/decline", requireAuth, async (req: Request, res: Response) => {
    try {
        const currentUser = await prisma.user.findUnique({
            where: { authId: req.supabaseUser.id }
        });

        if (!currentUser) {
            return res.status(404).json({ error: "Current user not found" });
        }

        const result = await prisma.locationShare.updateMany({
            where: { id: req.params.id, sharerId: currentUser.id, status: "REQUESTED" },
            data: { status: "DECLINED" }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: "No pending share with that id for you" });
        }

        const share = await prisma.locationShare.findUnique({ where: { id: req.params.id } });
        res.status(200).json(share);
    } catch (error) {
        console.error("PATCH /decline failed:", error);
        res.status(500).json({ error: "Failed to decline location share request" });
    }
});

router.patch("/:id/end", requireAuth, async (req: Request, res: Response) => {
    try {
        const currentUser = await prisma.user.findUnique({
            where: { authId: req.supabaseUser.id }
        });

        if (!currentUser) {
            return res.status(404).json({ error: "Current user not found" });
        }

        const result = await prisma.locationShare.updateMany({
            where: { id: req.params.id, sharerId: currentUser.id, status: "ACTIVE", OR: [{requesterId: currentUser.id }, {sharerId: currentUser.id}] },
            data: { status: "ENDED", endedAt: new Date() }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: "No active share with that id for you" });
        }

        const share = await prisma.locationShare.findUnique({ where: { id: req.params.id } });
        res.status(200).json(share);
    } catch (error) {
        console.error("PATCH /end failed:", error);
        res.status(500).json({ error: "Failed to end location share request" });
    }
});

export default router;