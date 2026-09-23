import mongoose from 'mongoose';

const subTaskSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  is_completed: { type: Boolean, default: false },
  link: { type: String, default: '' },
});

const campaignWorkstreamSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    campaign_id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    sub_tasks: [subTaskSchema],
    status: { 
      type: String, 
      enum: ['ACTIVE', 'IGNORED'], 
      default: 'ACTIVE' 
    },
    display_order: { type: Number, default: 1 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('CampaignWorkstream', campaignWorkstreamSchema);