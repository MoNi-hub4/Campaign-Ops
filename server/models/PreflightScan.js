import mongoose from 'mongoose';

const captureSchema = new mongoose.Schema({
  order: Number,
  originalIndex: Number,
  sectionId: String,
  moduleName: String,
  moduleType: String,
  width: Number,
  height: Number,
  text: String,
  screenshotPath: String, // Relative path served via static endpoint
});

const preflightScanSchema = new mongoose.Schema(
  {
    targetUrl: { type: String, required: true },
    urlFolderName: { type: String, required: true },
    title: { type: String, default: '' },
    modulesFound: { type: Number, default: 0 },
    moduleScreenshotsSaved: { type: Number, default: 0 },
    fullPageScreenshot: String,
    captures: [captureSchema],
  },
  { timestamps: true }
);

export default mongoose.model('PreflightScan', preflightScanSchema);