import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "node:path";
import { connectDB } from "./config/db.js";
import couponRoutes from "./routes/couponRoutes.js";
import workstreamRoutes from "./routes/workstreamRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import scannerRoutes from "./routes/scannerRoutes.js";
import preflightRoutes from "./routes/preflightRoutes.js";
import chatReviewRoutes from "./routes/chatReviewRoutes.js";

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve screenshots directory statically for preflight and scanner UI previews
app.use("/screenshots", express.static(path.join(process.cwd(), "screenshots")));

// Mount Routes
app.use("/api/coupons", couponRoutes);
app.use("/api/workstreams", workstreamRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/scanner", scannerRoutes);
app.use("/api/preflight", preflightRoutes);
app.use("/api/chat-review", chatReviewRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in development mode on port ${PORT}`);
});