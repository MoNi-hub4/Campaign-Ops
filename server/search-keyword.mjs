import { createWorker } from "tesseract.js";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const fuzzyThreshold = 0.82;

// Screenshots directory inside your server folder
const screenshotRootDirectory = path.join(process.cwd(), "screenshots");

const configuredWorkerCount = Number.parseInt(
  process.env.OCR_WORKERS || "2",
  10
);

const ocrWorkerCount = Number.isFinite(configuredWorkerCount)
  ? Math.min(Math.max(configuredWorkerCount, 1), 4)
  : 2;

const forceOcrRefresh = process.env.OCR_REFRESH === "1";
const ocrCachePath = path.join(screenshotRootDirectory, "ocr-text-cache.json");

/**
 * Enhanced Sharp preprocessing pipeline:
 * Enhances low-contrast white-on-tan text, pastel gradients, 3D text outlines, and soft shadows.
 */
async function preprocessImageForOcr(imageBuffer) {
  try {
    return await sharp(imageBuffer)
      // 1. Upscale significantly to enlarge small character strokes
      .resize({ width: 3200, withoutEnlargement: false })
      // 2. Grayscale to remove background color hues
      .grayscale()
      // 3. Stretch dark/light contrast ranges
      .linear(2.5, -80)
      // 4. Sharpen letter edges
      .sharpen({ sigma: 2.0 })
      // 5. Binary thresholding: Converts low contrast text into crisp black on white
      .threshold(165)
      .png()
      .toBuffer();
  } catch (err) {
    return imageBuffer; // Fallback to raw buffer on error
  }
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularizeWord(word) {
  if (word.length <= 3) {
    return word;
  }

  if (word.endsWith("ies") && word.length > 4) {
    return `${word.slice(0, -3)}y`;
  }

  if (/(ches|shes|sses|xes|zes|ses)$/i.test(word)) {
    return word.slice(0, -2);
  }

  if (word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }

  return word;
}

function normalizePluralWords(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.split(" ").map(singularizeWord).join(" ");
}

function levenshteinDistance(first, second) {
  const rows = second.length + 1;
  const columns = first.length + 1;

  const matrix = Array.from({ length: rows }, () => Array(columns).fill(0));

  for (let column = 0; column < columns; column++) {
    matrix[0][column] = column;
  }

  for (let row = 0; row < rows; row++) {
    matrix[row][0] = row;
  }

  for (let row = 1; row < rows; row++) {
    for (let column = 1; column < columns; column++) {
      const charactersMatch = second[row - 1] === first[column - 1];
      const replacementCost = charactersMatch ? 0 : 1;

      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + replacementCost
      );
    }
  }

  return matrix[rows - 1][columns - 1];
}

function calculateSimilarity(first, second) {
  if (first === second) {
    return 1;
  }

  const longestLength = Math.max(first.length, second.length);

  if (longestLength === 0) {
    return 1;
  }

  const distance = levenshteinDistance(first, second);

  return 1 - distance / longestLength;
}

function findFuzzyPhrase(ocrText, searchKeyword, threshold = fuzzyThreshold) {
  const normalizedText = normalizePluralWords(ocrText);
  const normalizedKeyword = normalizePluralWords(searchKeyword);

  if (!normalizedText || !normalizedKeyword) {
    return {
      found: false,
      similarity: 0,
      matchedCandidate: "",
    };
  }

  const textWords = normalizedText.split(" ");
  const keywordWords = normalizedKeyword.split(" ");
  const compactKeyword = keywordWords.join("");

  let bestSimilarity = 0;
  let bestCandidate = "";

  const minimumWindow = Math.max(1, keywordWords.length - 1);
  const maximumWindow = keywordWords.length + 1;

  for (
    let windowSize = minimumWindow;
    windowSize <= maximumWindow;
    windowSize++
  ) {
    for (let index = 0; index <= textWords.length - windowSize; index++) {
      const candidateWords = textWords.slice(index, index + windowSize);
      const compactCandidate = candidateWords.join("");

      if (
        compactCandidate.length < compactKeyword.length * 0.6 ||
        compactCandidate.length > compactKeyword.length * 1.5
      ) {
        continue;
      }

      const similarity = calculateSimilarity(compactCandidate, compactKeyword);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestCandidate = candidateWords.join(" ");
      }
    }
  }

  return {
    found: bestSimilarity >= threshold,
    similarity: bestSimilarity,
    matchedCandidate: bestCandidate,
  };
}

function checkKeywordMatch(ocrText, searchKeyword) {
  const normalizedText = normalizeText(ocrText);
  const normalizedKeyword = normalizeText(searchKeyword);

  if (!normalizedText || !normalizedKeyword) {
    return {
      keywordFound: false,
      matchType: null,
      similarityScore: 0,
      matchedCandidate: "",
      normalizedText,
    };
  }

  if (normalizedText.includes(normalizedKeyword)) {
    return {
      keywordFound: true,
      matchType: "exact-or-plural-phrase",
      similarityScore: 1,
      matchedCandidate: normalizedKeyword,
      normalizedText,
    };
  }

  const compactText = normalizedText.replace(/\s+/g, "");
  const compactKeyword = normalizedKeyword.replace(/\s+/g, "");

  if (compactText.includes(compactKeyword)) {
    return {
      keywordFound: true,
      matchType: "compact-phrase",
      similarityScore: 1,
      matchedCandidate: compactKeyword,
      normalizedText,
    };
  }

  const singularText = normalizePluralWords(ocrText);
  const singularKeyword = normalizePluralWords(searchKeyword);

  const compactSingularText = singularText.replace(/\s+/g, "");
  const compactSingularKeyword = singularKeyword.replace(/\s+/g, "");

  if (
    singularText.includes(singularKeyword) ||
    compactSingularText.includes(compactSingularKeyword)
  ) {
    return {
      keywordFound: true,
      matchType: "singular-plural-variation",
      similarityScore: 1,
      matchedCandidate: singularKeyword,
      normalizedText,
    };
  }

  const fuzzyResult = findFuzzyPhrase(ocrText, searchKeyword, fuzzyThreshold);

  return {
    keywordFound: fuzzyResult.found,
    matchType: fuzzyResult.found ? "fuzzy-match" : null,
    similarityScore: Number(fuzzyResult.similarity.toFixed(2)),
    matchedCandidate: fuzzyResult.matchedCandidate,
    normalizedText,
  };
}

async function findSectionScreenshots(rootDirectory, targetFolderFilter = "") {
  const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
  const screenshots = [];

  async function walkDirectory(currentDirectory, insideSections = false) {
    let entries;

    try {
      entries = await fs.readdir(currentDirectory, {
        withFileTypes: true,
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        return;
      }
      throw error;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        const relativeDirectory = path.relative(rootDirectory, entryPath);
        const topLevelDirectory = relativeDirectory.split(path.sep)[0];

        if (topLevelDirectory === "matches") {
          continue;
        }

        // FILTER: Skip website folders that don't match the selected URL card
        if (
          targetFolderFilter &&
          topLevelDirectory.toLowerCase() !== targetFolderFilter.toLowerCase()
        ) {
          continue;
        }

        await walkDirectory(
          entryPath,
          insideSections || entry.name.toLowerCase() === "sections"
        );

        continue;
      }

      if (!entry.isFile() || !insideSections) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();

      if (!supportedExtensions.has(extension)) {
        continue;
      }

      const relativePath = path.relative(rootDirectory, entryPath);
      const fileStats = await fs.stat(entryPath);

      screenshots.push({
        filename: entry.name,
        absolutePath: entryPath,
        relativePath,
        displayPath: relativePath.split(path.sep).join("/"),
        websiteFolder: relativePath.split(path.sep)[0],
        size: fileStats.size,
        mtimeMs: fileStats.mtimeMs,
      });
    }
  }

  await walkDirectory(rootDirectory);

  return screenshots.sort((first, second) =>
    first.displayPath.localeCompare(second.displayPath)
  );
}

async function loadOcrCache() {
  if (forceOcrRefresh) {
    return {
      version: 1,
      entries: {},
    };
  }

  try {
    const cacheText = await fs.readFile(ocrCachePath, "utf8");
    const cache = JSON.parse(cacheText);

    return {
      version: 1,
      entries: cache.entries && typeof cache.entries === "object" ? cache.entries : {},
    };
  } catch (error) {
    if (error.code !== "ENOENT" && error.name !== "SyntaxError") {
      console.warn(`Could not read OCR cache: ${error.message}`);
    }

    return {
      version: 1,
      entries: {},
    };
  }
}

function getCachedOcrResult(imageFile, cache) {
  if (forceOcrRefresh) {
    return null;
  }

  const cachedEntry = cache.entries[imageFile.displayPath];

  if (!cachedEntry) {
    return null;
  }

  if (
    cachedEntry.size !== imageFile.size ||
    cachedEntry.mtimeMs !== imageFile.mtimeMs
  ) {
    return null;
  }

  return {
    detectedText: cachedEntry.detectedText || "",
    confidence: cachedEntry.confidence ?? null,
  };
}

async function searchScreenshots(keyword, safeKeyword, matchDirectory, reportPath, targetFolderFilter = "") {
  await fs.mkdir(matchDirectory, {
    recursive: true,
  });

  // Filter screenshots strictly to the requested URL directory if provided
  const imageFiles = await findSectionScreenshots(screenshotRootDirectory, targetFolderFilter);

  if (imageFiles.length === 0) {
    console.log(`No section screenshots found for filter: ${targetFolderFilter || "ALL"}`);
    return {
      keyword,
      fuzzyThreshold,
      targetFolderFilter,
      scannedAt: new Date().toISOString(),
      totalScreenshots: 0,
      matches: [],
      nonMatches: [],
      failures: [],
    };
  }

  // Load existing OCR cache
  const ocrCache = await loadOcrCache();

  // CLEAR PER-URL CACHE: Delete existing cache entries for the target folder to force a fresh rescan
  if (targetFolderFilter) {
    const filterPrefix = targetFolderFilter.toLowerCase() + "/";
    let clearedCount = 0;

    Object.keys(ocrCache.entries).forEach((key) => {
      if (key.toLowerCase().startsWith(filterPrefix)) {
        delete ocrCache.entries[key];
        clearedCount++;
      }
    });

    console.log(`Cleared ${clearedCount} cached OCR entries for folder: "${targetFolderFilter}"`);
  }

  // Find images needing fresh OCR execution within the target URL folder
  const imagesNeedingOcr = imageFiles.filter(
    (imageFile) => !getCachedOcrResult(imageFile, ocrCache)
  );

  const activeWorkerCount = Math.min(ocrWorkerCount, imagesNeedingOcr.length);

  const matches = [];
  const nonMatches = [];
  const failures = [];

  async function processDetectedText(
    imageFile,
    detectedText,
    confidence,
    usedCache
  ) {
    const matchResult = checkKeywordMatch(detectedText, keyword);

    const commonResult = {
      filename: imageFile.filename,
      relativeScreenshotPath: imageFile.displayPath,
      websiteFolder: imageFile.websiteFolder,
      keyword,
      confidence,
      usedOcrCache: usedCache,
      detectedText: detectedText.replace(/\s+/g, " ").trim(),
    };

    if (!matchResult.keywordFound) {
      nonMatches.push({
        ...commonResult,
        bestSimilarityScore: matchResult.similarityScore,
        bestCandidate: matchResult.matchedCandidate,
      });
      return;
    }

    const matchedScreenshotPath = path.join(
      matchDirectory,
      imageFile.relativePath
    );

    await fs.mkdir(path.dirname(matchedScreenshotPath), {
      recursive: true,
    });

    await fs.copyFile(imageFile.absolutePath, matchedScreenshotPath);

    matches.push({
      ...commonResult,
      originalScreenshotPath: imageFile.absolutePath,
      matchedScreenshotPath,
      matchType: matchResult.matchType,
      similarityScore: matchResult.similarityScore,
      matchedCandidate: matchResult.matchedCandidate,
    });
  }

  // 1. Process cached OCR text for images in the filtered folder
  for (const imageFile of imageFiles) {
    const cachedResult = getCachedOcrResult(imageFile, ocrCache);
    if (!cachedResult) continue;

    await processDetectedText(
      imageFile,
      cachedResult.detectedText,
      cachedResult.confidence,
      true
    );
  }

  // 2. Process new OCR scans if any remain
  const workers = [];
  if (activeWorkerCount > 0) {
    for (let index = 0; index < activeWorkerCount; index++) {
      const worker = await createWorker("eng");
      await worker.setParameters({ tessedit_pageseg_mode: "11" });
      workers.push(worker);
    }
  }

  let nextImageIndex = 0;
  async function runWorker(worker) {
    while (true) {
      const currentIndex = nextImageIndex;
      nextImageIndex++;
      if (currentIndex >= imagesNeedingOcr.length) break;

      const imageFile = imagesNeedingOcr[currentIndex];
      try {
        const rawBuffer = await fs.readFile(imageFile.absolutePath);
        const processedBuffer = await preprocessImageForOcr(rawBuffer);
        const result = await worker.recognize(processedBuffer);
        const detectedText = result.data.text || "";
        const confidence = result.data.confidence ?? null;

        ocrCache.entries[imageFile.displayPath] = {
          size: imageFile.size,
          mtimeMs: imageFile.mtimeMs,
          detectedText,
          confidence,
        };

        await processDetectedText(imageFile, detectedText, confidence, false);
      } catch (error) {
        failures.push({
          filename: imageFile.filename,
          relativeScreenshotPath: imageFile.displayPath,
          websiteFolder: imageFile.websiteFolder,
          error: error.message,
        });
      }
    }
  }

  try {
    await Promise.all(workers.map((worker) => runWorker(worker)));
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }

  // Write updated cache file back to disk
  await fs.writeFile(ocrCachePath, JSON.stringify(ocrCache, null, 2), "utf8");

  const report = {
    keyword,
    targetFolderFilter,
    fuzzyThreshold,
    scannedAt: new Date().toISOString(),
    totalScreenshots: imageFiles.length,
    totalMatches: matches.length,
    matches,
    nonMatches,
    failures,
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  return report;
}

// MAIN EXPORTED FUNCTION (Executed on API Request)
export async function runKeywordSearch(searchKeyword, targetFolderFilter = "") {
  const keyword = searchKeyword || "lunch box";
  const safeKeyword = keyword
    .replace(/[^a-z0-9_-]/gi, "-")
    .replace(/-+/g, "-")
    .toLowerCase() || "keyword";

  const matchDirectory = path.join(
    screenshotRootDirectory,
    "matches",
    safeKeyword
  );

  const reportPath = path.join(matchDirectory, "keyword-results.json");

  return await searchScreenshots(keyword, safeKeyword, matchDirectory, reportPath, targetFolderFilter);
}