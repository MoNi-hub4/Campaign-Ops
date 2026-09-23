import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    category_name: { type: String, default: 'General' },
    discount_type: { 
      type: String, 
      enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'], 
      required: true 
    },
    discount_value: { type: Number, required: true },
    minimum_spend: { type: Number, default: 0 },
    maximum_discount: { type: Number, default: 0 },
    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['DRAFT', 'SCHEDULED', 'PLANNED', 'LIVE', 'EXPIRED'], // Added PLANNED here
      default: 'PLANNED' 
    },
    campaign_id: { type: String, default: null },
    created_by: { type: String, default: 'user_moni' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Coupon', couponSchema);