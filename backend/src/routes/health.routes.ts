import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

export default router;
