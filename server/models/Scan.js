import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, default: 'IMAGE' },
  source: { type: String, default: 'DOM Element' },
  extractedText: { type: String, default: '' },
});

const scanSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    title: { type: String, required: true },
    scannedAt: { type: Date, default: Date.now },
    assets: [assetSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Scan', scanSchema);