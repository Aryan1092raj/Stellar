import { Router } from "express";

import authRoutes from "./auth.routes";
import organizationsRoutes from "./organizations.routes";
import donationsRoutes from "./donations";
import voiceAgentRoutes from "./voiceAgent.routes";
import chatRoutes from "./chat";
import demoRoutes from "./demo";
import evidenceRoutes from "./evidence";
import adminRoutes from "./admin";
import healthRoutes from "./health.routes";
import impactRoutes from "./impact";
import ngosRoutes from "./ngos";
import otpRoutes from "./otp";
import projectsRoutes from "./projects";


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
