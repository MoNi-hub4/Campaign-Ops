import mongoose from "mongoose";

const PriorityItemSchema = new mongoose.Schema(
  {
    reviewDate: { type: String, required: true },
    sourceType: { type: String, enum: ["Morning", "EOD"], default: "Morning" },
    threadTitle: { type: String, required: true },
    openerName: { type: String, default: "" },
    priorityLevel: { type: String, default: "Priority 3 (General Check)" },
    market: { type: String, default: "AE/SA" },
    whyItMatters: { type: String, default: "" },
    commercialQuestion: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Discussed", "Done", "Carried Forward"],
      default: "Pending",
    },
    // Deep Dive Analysis Persistence
    rawThreadText: { type: String, default: "" },
    threadAnalysis: {
      executiveSummary: { type: String, default: "" },
      keyTakeaways: { type: [String], default: [] },
      potentialRisksOrBlockers: { type: String, default: "" },
      recommendedActionOrReply: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("PriorityItem", PriorityItemSchema);