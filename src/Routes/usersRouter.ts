import { type Request, type Response, Router } from 'express';

const router = Router();



router.get('/all_users', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

export default router;