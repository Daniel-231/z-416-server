import { NextFunction, Request, Response } from "express";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "../lib/supabase";

declare global {
    namespace Express {
        interface Request {
            supabaseUser: User;
        }
    }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing bearer token' });
    }

    const token = header.slice('Bearer '.length);
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.supabaseUser = data.user;
    next();
}