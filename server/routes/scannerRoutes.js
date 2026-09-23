import express from "express";
import mongoose from "mongoose";
import { createWorker } from "tesseract.js";
import Scan from "../models/Scan.js";

const router = express.Router();

// Mobile User-Agent string simulating an iPhone (iOS / Chrome Mobile)
const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1";

// Special slider definition list
const specialSliderDefinitions = [
  { identity: "adbannerslider", type: "ad-banner-slider" },
  { identity: "homepage-category-icons", type: "homepage-category-icons" },
  { identity: "frenzydealmodule", type: "frenzy-deal-slider" },
  { identity: "bannermodulescroller", type: "banner-scroller" },
  { identity: "noondynamiccarousel", type: "ad-banner-slider" },
  { identity: "hero-slider", type: "ad-banner-slider" },
];

function identifyModuleType(sectionId) {
  const id = sectionId.toLowerCase();

  if (id.includes("adbannerslider") || id.includes("noondynamiccarousel")) {
    return "ad-banner-slider";
  }
  if (id.includes("homepage-category-icons")) return "homepage-category-icons";
  if (id.includes("bannermodulescroller")) return "banner-scroller";
  if (id.includes("bannermodulestrip")) return "banner-strip";
  if (id.includes("atfbanner")) return "atf-banner";
  if (id.includes("frenzydealmodule")) return "frenzy-deal";
  if (id.includes("categoryicons")) return "category-icons";

  return "unknown-module";
}

// Universal detector supporting both Swiper and Embla Carousels
async function detectSpecialSlider(section, sectionId) {
  const normalizedSectionId = sectionId.toLowerCase();

  const isCarousel = await section
    .evaluate((element) => {
      const hasEmbla =
        element.querySelector('[class*="emblaSlide"], [class*="emblaContainer"]') !== null;
      const hasSwiper =
        element.querySelector('.swiper-slide, [class*="swiper-slide"]') !== null;
      return hasEmbla || hasSwiper;
    })
    .catch(() => false);

  if (isCarousel) {
    return {
      identity: "universal-carousel",
      type: "ad-banner-slider",
    };
  }

  for (const definition of specialSliderDefinitions) {
    if (normalizedSectionId.includes(definition.identity)) {
      return definition;
    }
  }

  return null;
}

// Collector extracting Embla Slides (_emblaSlide_*) and Swiper Slides
async function getAdBannerSlideRecords(sliderRoot) {
  let slides = sliderRoot.locator(
    '[class*="emblaSlide"], .swiper-slide, [data-swiper-slide-index], [class*="_emblaSlide_"]'
  );

  if ((await slides.count()) === 0) {
    slides = sliderRoot.locator("a:has(img), a:has(picture)");
  }

  if ((await slides.count()) === 0) {
    slides = sliderRoot.locator(
      '[class*="slide" i]:has(img), [class*="banner" i]:has(img)'
    );
  }

  const records = await slides.evaluateAll((elements) => {
    const results = [];
    const seenIndexes = new Set();

    elements.forEach((element, domIndex) => {
      const className =
        typeof element.className === "string" ? element.className.toLowerCase() : "";

      if (
        className.includes("swiper-slide-duplicate") ||
        className.includes("swiper-slide-blank")
      ) {
        return;
      }

      const rawRealIndex = element.getAttribute("data-swiper-slide-index");
      const parsedRealIndex = rawRealIndex === null ? Number.NaN : Number(rawRealIndex);
      const realIndex = Number.isFinite(parsedRealIndex) ? parsedRealIndex : domIndex;

      const uniqueKey = String(realIndex);
      if (seenIndexes.has(uniqueKey)) return;

      seenIndexes.add(uniqueKey);
      results.push({ domIndex, realIndex });
    });

    return results;
  });

  return { slides, records };
}

// Universal module section capturer
async function captureModuleSections(page, sectionDirectory) {
  await dismissCookieBanner(page);

  // Catch ALL v-sensor components, dynamic modules, and widget containers
  const sectionSelector = [
    'div[id^="v-sensor"]',
    '[id^="v-sensor"]',
    'div[id*="-module-"]',
    'div[data-qa^="widget_"]',
    '[data-qa*="widget_"]',
    'div[class*="_container_"]',
  ].join(",");

  const sections = page.locator(sectionSelector);
  const totalSections = await sections.count();
  const captures = [];
  const processedSectionIds = new Set();

  for (let index = 0; index < totalSections; index++) {
    const section = sections.nth(index);

    // Scroll into view to trigger IntersectionObserver lazy loading
    await section.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);

    if (!(await section.isVisible().catch(() => false))) continue;

    const rawId = await section.getAttribute("id");
    const dataQa = await section.getAttribute("data-qa");
    const sectionId = rawId || dataQa || `v-sensor-module-${index}`;

    if (processedSectionIds.has(sectionId)) continue;
    processedSectionIds.add(sectionId);

    // Clean up filename
    const moduleName = sectionId
      .replace(/^v-sensor-component(-\d+)*-module-/, "")
      .replace(/^v-sensor-component-/, "")
      .replace(/^widget_/, "");

    const moduleType = identifyModuleType(sectionId);
    const sliderDefinition = await detectSpecialSlider(section, sectionId);

    // Extract dynamic slider slides (Embla / Swiper / Frenzy Deals / Hero Carousels)
    if (sliderDefinition) {
      const sectionNumber = String(index + 1).padStart(3, "0");
      const sliderCaptures = await captureSpecialSliderStates(page, section, {
        sectionDirectory,
        sliderDefinition,
        sectionNumber,
        originalIndex: index,
        sectionId,
        moduleName,
        moduleType,
      });

      if (sliderCaptures.length > 0) {
        for (const capture of sliderCaptures) {
          captures.push({ order: captures.length + 1, ...capture });
        }
        continue;
      }
    }

    await waitForModuleImages(section);

    const boundingBox = await section.boundingBox();
    if (!boundingBox || boundingBox.width < 50 || boundingBox.height < 30) continue;

    const safeModuleName = createSafeFilename(moduleName) || "unknown-module";
    const screenshotNumber = String(captures.length + 1).padStart(3, "0");
    const filename = `${screenshotNumber}-${safeModuleName}.png`;
    const screenshotPath = path.join(sectionDirectory, filename);

    await section.screenshot({ path: screenshotPath, animations: "disabled" });
    const sectionText = await section.innerText().catch(() => "");

    captures.push({
      order: captures.length + 1,
      originalIndex: index,
      sectionId,
      moduleName,
      moduleType,
      width: Math.round(boundingBox.width),
      height: Math.round(boundingBox.height),
      text: sectionText.replace(/\s+/g, " ").trim().slice(0, 500),
      screenshotPath,
    });

    console.log(`Captured module ${captures.length}: ${moduleName}`);
  }

  return { totalSections, captures };
}

// Helper function to extract image URLs from HTML content
const extractImagesFromHtml = (htmlContent, baseUrl) => {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const matches = [];
  let match;

  while ((match = imgRegex.exec(htmlContent)) !== null) {
    let src = match[1];
    if (src.startsWith("//")) {
      src = `https:${src}`;
    } else if (src.startsWith("/")) {
      try {
        const parsedUrl = new URL(baseUrl);
        src = `${parsedUrl.protocol}//${parsedUrl.host}${src}`;
      } catch (e) {
        // Fallback
      }
    }

    if (/^https?:\/\//i.test(src) && !/\.(svg|ico)(\?.*)?$/i.test(src)) {
      matches.push(src);
    }
  }
  return [...new Set(matches)];
};

// POST /api/scanner/scan - Save Mobile View Scan directly to Database
router.post("/scan", async (req, res) => {
  let worker;
  try {
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ message: "A valid URL is required" });
    }

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    // Fetch page using Mobile User-Agent and headers
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": MOBILE_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"iOS"',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load target URL (Status: ${response.status})`);
    }

    const htmlText = await response.text();
    const extractedImageUrls = extractImagesFromHtml(htmlText, targetUrl);

    const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : targetUrl;

    worker = await createWorker("eng");

    const processedAssets = await Promise.all(
      extractedImageUrls.map(async (imgUrl) => {
        let extractedText = "";
        try {
          const imgRes = await fetch(imgUrl, {
            headers: {
              "User-Agent": MOBILE_USER_AGENT,
            },
          });

          const contentType = imgRes.headers.get("content-type") || "";
          const isSupportedType =
            contentType.includes("image/png") ||
            contentType.includes("image/jpeg") ||
            contentType.includes("image/jpg") ||
            contentType.includes("image/webp") ||
            contentType.includes("image/bmp");

          if (imgRes.ok && isSupportedType) {
            const arrayBuffer = await imgRes.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);

            if (imageBuffer && imageBuffer.length > 512) {
              const ret = await worker.recognize(imageBuffer);
              extractedText = ret.data.text
                ? ret.data.text.trim().toLowerCase()
                : "";
            }
          }
        } catch (ocrErr) {
          console.warn(`[OCR Warning] Skipped ${imgUrl}:`, ocrErr.message);
        }

        const ext =
          imgUrl.split(".").pop()?.split("?")[0]?.toUpperCase() || "PNG";
        return {
          url: imgUrl,
          type: ["PNG", "JPG", "JPEG", "WEBP"].includes(ext) ? ext : "IMAGE",
          source: "Mobile View",
          extractedText,
        };
      })
    );

    if (worker) {
      await worker.terminate();
    }

    // SAVE TO MONGODB DATABASE
    const newScan = await Scan.create({
      url: targetUrl,
      title: `${pageTitle} (Mobile)`,
      assets: processedAssets,
    });

    res.status(201).json(newScan);
  } catch (error) {
    if (worker) {
      try {
        await worker.terminate();
      } catch (tErr) {
        // Cleanup worker on error
      }
    }
    console.error("Scanner OCR error:", error);
    res
      .status(500)
      .json({ message: "Failed to scan website", error: error.message });
  }
});

// GET /api/scanner - Fetch all Scans from Database
router.get("/", async (req, res) => {
  try {
    const scans = await Scan.find().sort({ createdAt: -1 });
    res.json(scans);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch scan records", error: error.message });
  }
});

// DELETE /api/scanner/:id - Delete Scan from Database
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid scan ID format" });
    }

    const deletedScan = await Scan.findByIdAndDelete(id);

    if (!deletedScan) {
      return res.status(404).json({ message: "Scan record not found" });
    }

    res.json({ message: "Scan deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete scan", error: error.message });
  }
});

export default router;