import { Request, Response } from 'express';

export const healthController = {
  /**
   * GET /health
   * Health check endpoint
   */
  check: (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      },
    });
  },
};
