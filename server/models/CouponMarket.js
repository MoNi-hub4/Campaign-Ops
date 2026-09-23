import mongoose from 'mongoose';

const couponMarketSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. "coupon_market_ae"
    coupon_id: { type: String, ref: 'Coupon', required: true },
    market_id: { type: String, ref: 'Market', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export default mongoose.model('CouponMarket', couponMarketSchema);