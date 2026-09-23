import mongoose from 'mongoose';

const campaignCouponSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. "campaign_coupon_travel"
    campaign_id: { type: String, required: true }, // Logic FK -> Campaigns.id
    coupon_id: { type: String, ref: 'Coupon', required: true },
    touchpoint: { type: String },
    notes: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export default mongoose.model('CampaignCoupon', campaignCouponSchema);