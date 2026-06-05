import { Router } from "express";

import authRoutes from "./auth.routes";
import organizationsRoutes from "./organizations.routes";
import donationsRoutes from "./donations";
import chatRoutes from "./chat";
import evidenceRoutes from "./evidence";
import adminRoutes from "./admin";
import healthRoutes from "./health.routes";
import ngosRoutes from "./ngos";
import otpRoutes from "./otp";
import projectsRoutes from "./projects";

const router = Router();

// Main application routes
router.use("/auth", authRoutes);
router.use("/organizations", organizationsRoutes);
router.use("/donations", donationsRoutes);
router.use("/chat", chatRoutes);
router.use("/evidence", evidenceRoutes);
router.use("/admin", adminRoutes);
router.use("/health", healthRoutes);
router.use("/ngos", ngosRoutes);
router.use("/otp", otpRoutes);
router.use("/projects", projectsRoutes);

export default router;
