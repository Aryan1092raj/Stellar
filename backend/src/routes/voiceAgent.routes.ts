import { Router } from "express";
import { voiceAgentController } from "../controllers/voiceAgent.controller";
import { validateBody } from "../middleware/validator";
import { z } from "zod";

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationHistory: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    )
    .optional(),
});

router.post("/chat", validateBody(chatSchema), voiceAgentController.chat);
router.post("/transcribe", voiceAgentController.transcribe);

export default router;
