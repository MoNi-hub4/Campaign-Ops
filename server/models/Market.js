import mongoose from 'mongoose';

const marketSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. "market_ae"
    code: { type: String, required: true, uppercase: true }, // e.g. "AE", "SA"
    name: { type: String, required: true },
    currency_code: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Dubai' },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Market', marketSchema);