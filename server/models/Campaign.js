import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, default: 'Awareness campaign' },
    dateRange: { type: String, default: 'TBD' },
    markets: { type: String, default: 'AE + KSA' },
    status: { type: String, default: 'Planning' },
    objective: { type: String, default: '' },
    owner: { type: String, default: 'Monishan · Onsite' },
    proofsCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Campaign', campaignSchema);