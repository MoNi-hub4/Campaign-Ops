import mongoose from 'mongoose';

const workstreamTemplateSchema = new mongoose.Schema(
  {
    // CRITICAL FIX: Explicitly allow custom String IDs (e.g., 'template_name_123')
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    sub_tasks: [{ type: String }],
    is_active: { type: Boolean, default: true },
    display_order: { type: Number, default: 1 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('WorkstreamTemplate', workstreamTemplateSchema);