import express from 'express';
import path from 'node:path';
import { runPreflightScan } from '../preflight.mjs';
import { runKeywordSearch } from '../search-keyword.mjs';
import PreflightScan from '../models/PreflightScan.js';

const router = express.Router();

// Serve screenshot images static folder
router.use('/screenshots', express.static(path.join(process.cwd(), 'screenshots')));

// POST /api/preflight/capture - Run Playwright Capture & Save to Database
router.post('/capture', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'URL is required' });

    // Execute Playwright runner
    const results = await runPreflightScan(url);
    const scanData = Array.isArray(results) ? results[0] : results;

    if (!scanData || !scanData.success) {
      return res.status(500).json({ message: scanData?.error || 'Capture failed' });
    }

    // Transform full system file paths into clean relative paths for server static URLs
    const sanitizedCaptures = (scanData.captures || []).map((cap) => {
      const relPath = `${scanData.urlFolderName}/sections/${path.basename(cap.screenshotPath)}`;
      return {
        ...cap,
        screenshotPath: relPath,
      };
    });

    // Save to Database
    const savedRecord = await PreflightScan.create({
      targetUrl: scanData.targetUrl,
      urlFolderName: scanData.urlFolderName,
      title: scanData.title || scanData.targetUrl,
      modulesFound: scanData.modulesFound,
      moduleScreenshotsSaved: scanData.moduleScreenshotsSaved,
      fullPageScreenshot: `${scanData.urlFolderName}/full-page-result.png`,
      captures: sanitizedCaptures,
    });

    res.status(201).json(savedRecord);
  } catch (err) {
    console.error('Preflight capture error:', err);
    res.status(500).json({ message: 'Capture script failed', error: err.message });
  }
});

// GET /api/preflight - Get all Scans grouped/sorted by URL record from Database
router.get('/', async (req, res) => {
  try {
    const scans = await PreflightScan.find().sort({ createdAt: -1 });
    res.json(scans);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch preflight scans', error: err.message });
  }
});

// DELETE /api/preflight/:id - Delete Scan record
router.delete('/:id', async (req, res) => {
  try {
    await PreflightScan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Preflight scan deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete record', error: err.message });
  }
});

// POST /api/preflight/search - Trigger OCR search script
router.post('/search', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ message: 'Keyword is required' });

    const report = await runKeywordSearch(keyword);
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ message: 'Search script failed', error: err.message });
  }
});

export default router;