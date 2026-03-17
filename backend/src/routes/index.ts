import { Router } from "express";

import authRoutes from "./auth.routes.js";
import organizationsRoutes from "./organizations.routes.js";
import donationsRoutes from "./donations.js";
import voiceAgentRoutes from "./voiceAgent.routes.js";
import chatRoutes from "./chat.js";
import demoRoutes from "./demo.js";
import evidenceRoutes from "./evidence.js";
import adminRoutes from "./admin.js";
import healthRoutes from "./health.routes.js";
import impactRoutes from "./impact.js";
import ngosRoutes from "./ngos.js";
import otpRoutes from "./otp.js";
import projectsRoutes from "./projects.js";


// console.log("ROUTE TYPES:", {
//   chatRoutes: chatRoutes,
//   demoRoutes: demoRoutes,
//   evidenceRoutes: evidenceRoutes,
//   adminRoutes: adminRoutes,
//   healthRoutes: healthRoutes,
//   impactRoutes: impactRoutes,
//   ngosRoutes: ngosRoutes,
//   otpRoutes: otpRoutes,
//   projectsRoutes: projectsRoutes
// });


const router = Router();

// Main application routes
router.use("/auth", authRoutes);
router.use("/organizations", organizationsRoutes);
router.use("/donations", donationsRoutes);
router.use("/voice-agent", voiceAgentRoutes);
router.use("/chat", chatRoutes);
router.use("/demo", demoRoutes);
router.use("/evidence", evidenceRoutes);
router.use("/admin", adminRoutes);
router.use("/health", healthRoutes);
router.use("/impact", impactRoutes);
router.use("/ngos", ngosRoutes);
router.use("/otp", otpRoutes);
router.use("/projects", projectsRoutes);

// Legacy/duplicate auth routes - might need review


export default router;
