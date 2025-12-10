import { Router } from 'express';
// Add any necessary controller imports here

const router = Router();

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Add other routes from the original files here

export default router;
