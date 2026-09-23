import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Apply stealth evasion plugin to mask Playwright headless fingerprints
chromium.use(stealthPlugin());

// Screenshots directory inside your server folder
const screenshotRootDirectory = path.join(process.cwd(), "screenshots");

const maximumSliderStates = 60;
const sliderTransitionWait = 800;

const cookieHidingCss = `
  #onetrust-banner-sdk,
  #onetrust-consent-sdk,
  #onetrust-pc-sdk,
  .onetrust-pc-dark-filter,
  [id*="cookie-banner" i],
  [class*="cookie-banner" i],
  [id*="cookie-consent" i],
  [class*="cookie-consent" i],
  [id*="consent-banner" i],
  [class*="consent-banner" i],
  iframe[title*="cookie" i],
  iframe[id*="cookie" i],
  iframe[class*="cookie" i] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

const specialSliderDefinitions = [
  {
    identity: "adbannerslider",
    type: "ad-banner-slider",
  },
  {
    identity: "homepage-category-icons",
    type: "homepage-category-icons",
  },
  {
    identity: "frenzydealmodule",
    type: "frenzy-deal-slider",
  },
  {
    identity: "bannermodulescroller",
    type: "banner-scroller",
  },
];

const nextButtonSelectors = [
  ".swiper-button-next",
  '[class*="swiper-button-next" i]',
  'button[aria-label="Next" i]',
  '[role="button"][aria-label="Next" i]',
  'button[aria-label*="next" i]',
  '[role="button"][aria-label*="next" i]',
  'button[title*="next" i]',
  '[role="button"][title*="next" i]',
  ".slick-next",
  '[class*="slick-next" i]',
  '[class*="arrow-right" i]',
  '[class*="right-arrow" i]',
  '[class*="next-button" i]',
  '[data-testid*="next" i]',
  '[data-qa*="next" i]',
];

async function dismissCookieBanner(page) {
  const buttonSelectors = [
    "#onetrust-accept-btn-handler",
    'button:has-text("Accept All Cookies")',
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept All")',
    'button:has-text("Accept all")',
    '[role="button"]:has-text("Accept All")',
  ];

  let clicked = false;
  let clickedSelector = null;

  for (const frame of page.frames()) {
    for (const selector of buttonSelectors) {
      const button = frame.locator(selector).first();

      try {
        if (!(await button.isVisible())) {
          continue;
        }

        await button.click({ timeout: 3000 });
        clicked = true;
        clickedSelector = selector;
        console.log(`Cookie banner dismissed using: ${selector}`);
        break;
      } catch {
        // Try next selector.
      }
    }

    if (clicked) break;
  }

  if (clicked) {
    await page.waitForTimeout(700);
  }

  for (const frame of page.frames()) {
    await frame.addStyleTag({ content: cookieHidingCss }).catch(() => {});
  }

  let hiddenCount = 0;

  for (const frame of page.frames()) {
    const frameHiddenCount = await frame
      .evaluate(() => {
        const selectors = [
          '[id*="cookie" i]',
          '[class*="cookie" i]',
          '[id*="consent" i]',
          '[class*="consent" i]',
          '[aria-label*="cookie" i]',
          '[role="dialog"]',
          "button",
          '[role="button"]',
        ].join(",");

        const candidates = Array.from(document.querySelectorAll(selectors));
        const hiddenElements = new Set();

        for (const candidate of candidates) {
          const text = (candidate.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
          const identity = `${candidate.id || ""} ${typeof candidate.className === "string" ? candidate.className : ""}`.toLowerCase();

          const looksLikeCookieConsent =
            text.includes("accept all cookies") ||
            text === "accept all" ||
            text.includes("cookie preferences") ||
            text.includes("cookie consent") ||
            identity.includes("cookie-banner") ||
            identity.includes("cookie-consent") ||
            identity.includes("consent-banner") ||
            identity.includes("onetrust");

          if (!looksLikeCookieConsent) continue;

          let currentElement = candidate;
          let overlayElement = null;

          for (let level = 0; level < 12 && currentElement; level++) {
            const style = window.getComputedStyle(currentElement);
            const currentIdentity = `${currentElement.id || ""} ${typeof currentElement.className === "string" ? currentElement.className : ""}`.toLowerCase();

            const isOverlay =
              style.position === "fixed" ||
              style.position === "sticky" ||
              currentElement.getAttribute("role") === "dialog" ||
              currentIdentity.includes("cookie-banner") ||
              currentIdentity.includes("cookie-consent") ||
              currentIdentity.includes("consent-banner") ||
              currentIdentity.includes("onetrust");

            if (isOverlay) {
              overlayElement = currentElement;
              break;
            }

            currentElement = currentElement.parentElement;
          }

          if (!overlayElement) continue;

          overlayElement.style.setProperty("display", "none", "important");
          overlayElement.style.setProperty("visibility", "hidden", "important");
          overlayElement.style.setProperty("opacity", "0", "important");
          overlayElement.style.setProperty("pointer-events", "none", "important");

          hiddenElements.add(overlayElement);
        }

        if (window.getComputedStyle(document.body).overflow === "hidden") {
          document.body.style.setProperty("overflow", "auto", "important");
        }

        if (window.getComputedStyle(document.documentElement).overflow === "hidden") {
          document.documentElement.style.setProperty("overflow", "auto", "important");
        }

        return hiddenElements.size;
      })
      .catch(() => 0);

    hiddenCount += frameHiddenCount;
  }

  return {
    dismissed: clicked || hiddenCount > 0,
    clicked,
    clickedSelector,
    hiddenCount,
  };
}

async function autoScroll(page) {
  return await page.evaluate(async () => {
    const wait = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds));

    let previousHeight = document.documentElement.scrollHeight;
    let stableChecks = 0;
    let scrollSteps = 0;

    for (let attempt = 0; attempt < 100; attempt++) {
      window.scrollBy(0, window.innerHeight * 0.8);
      scrollSteps++;
      await wait(500);

      const currentHeight = document.documentElement.scrollHeight;
      const reachedBottom = window.scrollY + window.innerHeight >= currentHeight - 10;

      if (reachedBottom) {
        if (currentHeight === previousHeight) {
          stableChecks++;
        } else {
          stableChecks = 0;
        }

        if (stableChecks >= 3) break;
      }

      previousHeight = currentHeight;
    }

    return {
      scrollSteps,
      pageHeight: document.documentElement.scrollHeight,
    };
  });
}

function createSafeFilename(value) {
  return value
    .replace(/[^a-z0-9-_]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function createUrlFolderName(targetUrl) {
  const parsedUrl = new URL(targetUrl);
  const hostname = parsedUrl.hostname.replace(/^www\./i, "").toLowerCase();
  const pathname = parsedUrl.pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-");
  const pathLabel = pathname || "home";

  const querySuffix = parsedUrl.search
    ? `-${crypto.createHash("sha1").update(parsedUrl.search).digest("hex").slice(0, 8)}`
    : "";

  return (
    createSafeFilename(`${hostname}-${pathLabel}${querySuffix}`).toLowerCase() || "website"
  );
}

function createScreenshotHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function identifyModuleType(sectionId) {
  const id = sectionId.toLowerCase();

  if (id.includes("adbannerslider")) return "ad-banner-slider";
  if (id.includes("homepage-category-icons")) return "homepage-category-icons";
  if (id.includes("bannermodulescroller")) return "banner-scroller";
  if (id.includes("bannermodulestrip")) return "banner-strip";
  if (id.includes("atfbanner")) return "atf-banner";
  if (id.includes("frenzydealmodule")) return "frenzy-deal";
  if (id.includes("categoryicons")) return "category-icons";

  return "unknown-module";
}

async function detectSpecialSlider(section, sectionId) {
  const normalizedSectionId = sectionId.toLowerCase();

  for (const definition of specialSliderDefinitions) {
    if (normalizedSectionId.includes(definition.identity)) {
      return definition;
    }

    const matchingDescendant = section
      .locator(
        [
          `[id*="${definition.identity}" i]`,
          `[class*="${definition.identity}" i]`,
          `[data-testid*="${definition.identity}" i]`,
          `[data-qa*="${definition.identity}" i]`,
        ].join(",")
      )
      .first();

    if ((await matchingDescendant.count()) > 0) {
      return definition;
    }
  }

  return null;
}

async function getSpecialSliderRoot(section, identity) {
  const matchingDescendant = section
    .locator(
      [
        `[id*="${identity}" i]`,
        `[class*="${identity}" i]`,
        `[data-testid*="${identity}" i]`,
        `[data-qa*="${identity}" i]`,
      ].join(",")
    )
    .first();

  if ((await matchingDescendant.count()) > 0) {
    return matchingDescendant;
  }

  return section;
}

async function waitForModuleImages(section) {
  await section
    .locator("img")
    .evaluateAll(async (images) => {
      await Promise.all(
        images.map((image) => {
          if (image.complete) return Promise.resolve();

          return new Promise((resolve) => {
            const finish = () => resolve();
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
            setTimeout(finish, 3000);
          });
        })
      );
    })
    .catch(() => {});
}

async function captureExactModuleBuffer(page, section) {
  await section.evaluate((element) => {
    element.scrollIntoView({
      behavior: "instant",
      block: "center",
      inline: "nearest",
    });
  });

  await page.waitForTimeout(250);
  await waitForModuleImages(section);

  return await section.screenshot({
    animations: "disabled",
    caret: "hide",
    timeout: 30000,
  });
}

async function getSwiperState(sliderRoot) {
  return await sliderRoot.evaluate((root) => {
    const possibleElements = [
      root,
      root.closest(".swiper, swiper-container"),
      ...root.querySelectorAll(".swiper, swiper-container"),
    ].filter(Boolean);

    const swiperElement = possibleElements.find((element) => element.swiper);
    const swiper = swiperElement?.swiper;

    if (!swiper) {
      return { found: false };
    }

    const realSlideIndexes = [];
    const seenRealIndexes = new Set();

    Array.from(swiper.slides || []).forEach((slide, domIndex) => {
      const className =
        typeof slide.className === "string" ? slide.className.toLowerCase() : "";

      if (
        className.includes("swiper-slide-duplicate") ||
        className.includes("swiper-slide-blank")
      ) {
        return;
      }

      const rawIndex = slide.getAttribute("data-swiper-slide-index");
      const parsedIndex = rawIndex === null ? Number.NaN : Number(rawIndex);
      const realIndex = Number.isFinite(parsedIndex) ? parsedIndex : domIndex;

      if (seenRealIndexes.has(realIndex)) return;

      seenRealIndexes.add(realIndex);
      realSlideIndexes.push(realIndex);
    });

    return {
      found: true,
      loop: Boolean(swiper.params?.loop),
      activeIndex: swiper.activeIndex ?? 0,
      realIndex: swiper.realIndex ?? 0,
      translate: swiper.translate ?? 0,
      isBeginning: Boolean(swiper.isBeginning),
      isEnd: Boolean(swiper.isEnd),
      realSlideIndexes,
    };
  });
}

async function resetSwiper(sliderRoot) {
  return await sliderRoot.evaluate((root) => {
    const possibleElements = [
      root,
      root.closest(".swiper, swiper-container"),
      ...root.querySelectorAll(".swiper, swiper-container"),
    ].filter(Boolean);

    const swiperElement = possibleElements.find((element) => element.swiper);
    const swiper = swiperElement?.swiper;

    if (!swiper) return false;

    if (swiper.params?.loop && typeof swiper.slideToLoop === "function") {
      swiper.slideToLoop(0, 0, false);
    } else if (typeof swiper.slideTo === "function") {
      swiper.slideTo(0, 0, false);
    } else {
      return false;
    }

    swiper.update?.();
    return true;
  });
}

async function moveSwiperToRealIndex(sliderRoot, realIndex) {
  return await sliderRoot.evaluate((root, targetRealIndex) => {
    const possibleElements = [
      root,
      root.closest(".swiper, swiper-container"),
      ...root.querySelectorAll(".swiper, swiper-container"),
    ].filter(Boolean);

    const swiperElement = possibleElements.find((element) => element.swiper);
    const swiper = swiperElement?.swiper;

    if (!swiper) return false;

    if (swiper.params?.loop && typeof swiper.slideToLoop === "function") {
      swiper.slideToLoop(targetRealIndex, 0, false);
      return true;
    }

    if (typeof swiper.slideTo === "function") {
      swiper.slideTo(targetRealIndex, 0, false);
      return true;
    }

    return false;
  }, realIndex);
}

async function advanceSwiper(sliderRoot) {
  return await sliderRoot.evaluate((root) => {
    const possibleElements = [
      root,
      root.closest(".swiper, swiper-container"),
      ...root.querySelectorAll(".swiper, swiper-container"),
    ].filter(Boolean);

    const swiperElement = possibleElements.find((element) => element.swiper);
    const swiper = swiperElement?.swiper;

    if (!swiper || typeof swiper.slideNext !== "function") {
      return { moved: false };
    }

    const beforeActiveIndex = swiper.activeIndex ?? 0;
    const beforeTranslate = swiper.translate ?? 0;

    swiper.slideNext(0, false);
    swiper.update?.();

    const afterActiveIndex = swiper.activeIndex ?? 0;
    const afterTranslate = swiper.translate ?? 0;

    return {
      moved: beforeActiveIndex !== afterActiveIndex || beforeTranslate !== afterTranslate,
      isEnd: Boolean(swiper.isEnd),
      activeIndex: afterActiveIndex,
      translate: afterTranslate,
    };
  });
}

async function isNextButtonDisabled(button) {
  const ariaDisabled = await button.getAttribute("aria-disabled");
  const disabledAttribute = await button.getAttribute("disabled");
  const className = (await button.getAttribute("class")) || "";
  const disabledByPlaywright = await button.isDisabled().catch(() => false);

  const normalizedClassName = className.toLowerCase();

  return (
    ariaDisabled === "true" ||
    disabledAttribute !== null ||
    disabledByPlaywright ||
    normalizedClassName.includes("swiper-button-disabled") ||
    normalizedClassName.includes("swiper-button-lock") ||
    normalizedClassName.includes("slick-disabled") ||
    normalizedClassName.split(/\s+/).includes("disabled")
  );
}

async function findNextButton(section) {
  let visibleDisabledButton = null;

  for (const selector of nextButtonSelectors) {
    const candidates = section.locator(selector);
    const count = Math.min(await candidates.count(), 10);

    for (let index = 0; index < count; index++) {
      const candidate = candidates.nth(index);
      const visible = await candidate.isVisible().catch(() => false);

      if (!visible) continue;

      if (!(await isNextButtonDisabled(candidate))) {
        return candidate;
      }

      visibleDisabledButton ||= candidate;
    }
  }

  return visibleDisabledButton;
}

async function clickNextButton(button) {
  try {
    await button.scrollIntoViewIfNeeded();
    await button.click({ timeout: 5000 });
    return true;
  } catch {
    return await button
      .evaluate((element) => {
        if (typeof element.click === "function") {
          element.click();
          return true;
        }

        return element.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          })
        );
      })
      .catch(() => false);
  }
}

async function findHorizontalScroller(sliderRoot) {
  const rootIsScrollable = await sliderRoot
    .evaluate((element) => {
      const overflowX = window.getComputedStyle(element).overflowX;
      return (
        element.clientWidth > 0 &&
        element.scrollWidth > element.clientWidth + 5 &&
        ["auto", "scroll", "hidden", "clip"].includes(overflowX)
      );
    })
    .catch(() => false);

  if (rootIsScrollable) return sliderRoot;

  const candidates = sliderRoot.locator("*");
  const count = Math.min(await candidates.count(), 500);

  for (let index = 0; index < count; index++) {
    const candidate = candidates.nth(index);

    const scrollData = await candidate
      .evaluate((element) => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        overflowX: window.getComputedStyle(element).overflowX,
      }))
      .catch(() => null);

    if (
      scrollData &&
      scrollData.clientWidth > 0 &&
      scrollData.scrollWidth > scrollData.clientWidth + 5 &&
      ["auto", "scroll", "hidden", "clip"].includes(scrollData.overflowX)
    ) {
      return candidate;
    }
  }

  return null;
}

async function advanceHorizontalScroller(scroller) {
  return await scroller.evaluate((element) => {
    const before = element.scrollLeft;
    const maximum = element.scrollWidth - element.clientWidth;
    const direction = window.getComputedStyle(element).direction;
    const step = Math.max(element.clientWidth * 0.85, 1);

    if (direction === "rtl") {
      element.scrollLeft = Math.max(element.scrollLeft - step, -maximum);
    } else {
      element.scrollLeft = Math.min(element.scrollLeft + step, maximum);
    }

    return {
      moved: element.scrollLeft !== before,
      scrollLeft: element.scrollLeft,
      maximum,
    };
  });
}

async function saveSliderState(
  page,
  section,
  {
    sectionDirectory,
    sectionNumber,
    originalIndex,
    sectionId,
    moduleName,
    moduleType,
    stateNumber,
    seenHashes,
  }
) {
  const screenshotBuffer = await captureExactModuleBuffer(page, section);
  const screenshotHash = createScreenshotHash(screenshotBuffer);

  if (seenHashes.has(screenshotHash)) return null;

  seenHashes.add(screenshotHash);

  const safeModuleName = createSafeFilename(moduleName) || moduleType;
  const stateLabel = String(stateNumber).padStart(2, "0");
  const filename = `${sectionNumber}-${safeModuleName}-state-${stateLabel}.png`;
  const screenshotPath = path.join(sectionDirectory, filename);

  await fs.writeFile(screenshotPath, screenshotBuffer);

  const boundingBox = await section.boundingBox();
  const sectionText = await section.innerText().catch(() => "");

  return {
    originalIndex,
    sectionId,
    moduleName,
    moduleType,
    stateNumber,
    captureArea: "complete-module",
    width: Math.round(boundingBox?.width || 0),
    height: Math.round(boundingBox?.height || 0),
    text: sectionText.replace(/\s+/g, " ").trim().slice(0, 500),
    screenshotPath,
  };
}

async function getAdBannerSlideRecords(sliderRoot) {
  let slides = sliderRoot.locator(".swiper-slide, [data-swiper-slide-index]");

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
      const realIndex = Number.isFinite(parsedRealIndex) ? parsedRealIndex : results.length;

      const uniqueKey = String(realIndex);
      if (seenIndexes.has(uniqueKey)) return;

      seenIndexes.add(uniqueKey);
      results.push({ domIndex, realIndex });
    });

    return results;
  });

  return { slides, records };
}

async function captureElementWithoutClipping(page, element) {
  const captureId = `capture-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const dimensions = await element.evaluate((source, id) => {
    const rectangle = source.getBoundingClientRect();
    const width = Math.ceil(Math.max(rectangle.width, source.scrollWidth, 1));
    const height = Math.ceil(Math.max(rectangle.height, source.scrollHeight, 1));
    const sourceStyle = window.getComputedStyle(source);

    const host = document.createElement("div");
    host.setAttribute("data-banner-capture-host", id);

    const hostStyles = {
      position: "fixed",
      left: "0",
      top: "0",
      zIndex: "2147483647",
      width: `${width}px`,
      height: `${height}px`,
      margin: "0",
      padding: "0",
      overflow: "visible",
      background: sourceStyle.backgroundColor || "white",
    };

    for (const [property, value] of Object.entries(hostStyles)) {
      host.style.setProperty(
        property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
        value,
        "important"
      );
    }

    const clone = source.cloneNode(true);
    clone.setAttribute("data-banner-capture-clone", "true");

    const cloneStyles = {
      position: "relative",
      display: "block",
      visibility: "visible",
      opacity: "1",
      transform: "none",
      translate: "none",
      left: "0",
      right: "auto",
      top: "0",
      bottom: "auto",
      margin: "0",
      width: `${width}px`,
      height: `${height}px`,
      minWidth: `${width}px`,
      maxWidth: `${width}px`,
      overflow: "visible",
    };

    for (const [property, value] of Object.entries(cloneStyles)) {
      clone.style.setProperty(
        property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
        value,
        "important"
      );
    }

    host.appendChild(clone);
    document.body.appendChild(host);

    const sourceCanvases = source.querySelectorAll("canvas");
    const clonedCanvases = clone.querySelectorAll("canvas");

    sourceCanvases.forEach((sourceCanvas, index) => {
      const clonedCanvas = clonedCanvases[index];
      if (!clonedCanvas) return;
      clonedCanvas.width = sourceCanvas.width;
      clonedCanvas.height = sourceCanvas.height;
      clonedCanvas.getContext("2d")?.drawImage(sourceCanvas, 0, 0);
    });

    return { width, height };
  }, captureId);

  const clone = page
    .locator(`[data-banner-capture-host="${captureId}"] [data-banner-capture-clone="true"]`)
    .first();

  try {
    await waitForModuleImages(clone);
    await page.waitForTimeout(250);

    const buffer = await clone.screenshot({
      animations: "disabled",
      caret: "hide",
      timeout: 30000,
    });

    return { buffer, width: dimensions.width, height: dimensions.height };
  } finally {
    await page
      .locator(`[data-banner-capture-host="${captureId}"]`)
      .evaluate((host) => host.remove())
      .catch(() => {});
  }
}

async function captureIndividualAdBanners(
  page,
  section,
  sliderRoot,
  { sectionDirectory, sectionNumber, originalIndex, sectionId, moduleName, moduleType }
) {
  const { slides, records } = await getAdBannerSlideRecords(sliderRoot);

  if (records.length === 0) return [];

  const captures = [];
  const seenHashes = new Set();
  const safeModuleName = createSafeFilename(moduleName) || "ad-banner-slider";

  await section.evaluate((element) => {
    element.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
  });

  for (let index = 0; index < records.length && index < maximumSliderStates; index++) {
    const record = records[index];

    await moveSwiperToRealIndex(sliderRoot, record.realIndex);
    await page.waitForTimeout(sliderTransitionWait);

    let slide = slides.nth(record.domIndex);
    const activeSlide = sliderRoot.locator(".swiper-slide-active").first();

    if ((await activeSlide.count()) > 0 && (await activeSlide.isVisible().catch(() => false))) {
      const activeRealIndex = await activeSlide.getAttribute("data-swiper-slide-index");
      if (activeRealIndex === null || Number(activeRealIndex) === record.realIndex) {
        slide = activeSlide;
      }
    }

    await waitForModuleImages(slide);

    const dimensions = await slide
      .evaluate((element) => {
        const rectangle = element.getBoundingClientRect();
        return {
          width: Math.max(rectangle.width, element.scrollWidth),
          height: Math.max(rectangle.height, element.scrollHeight),
        };
      })
      .catch(() => null);

    if (!dimensions || dimensions.width < 50 || dimensions.height < 30) continue;

    const standaloneCapture = await captureElementWithoutClipping(page, slide);
    const screenshotHash = createScreenshotHash(standaloneCapture.buffer);

    if (seenHashes.has(screenshotHash)) continue;

    seenHashes.add(screenshotHash);

    const bannerNumber = String(captures.length + 1).padStart(2, "0");
    const filename = `${sectionNumber}-${safeModuleName}-banner-${bannerNumber}.png`;
    const screenshotPath = path.join(sectionDirectory, filename);

    await fs.writeFile(screenshotPath, standaloneCapture.buffer);
    const bannerText = await slide.innerText().catch(() => "");

    captures.push({
      originalIndex,
      sectionId,
      moduleName,
      moduleType,
      bannerNumber: captures.length + 1,
      realSlideIndex: record.realIndex,
      captureArea: "complete-individual-banner",
      width: standaloneCapture.width,
      height: standaloneCapture.height,
      text: bannerText.replace(/\s+/g, " ").trim().slice(0, 500),
      screenshotPath,
    });
  }

  return captures;
}

async function captureSpecialSliderStates(
  page,
  section,
  { sectionDirectory, sliderDefinition, sectionNumber, originalIndex, sectionId, moduleName, moduleType }
) {
  const sliderRoot = await getSpecialSliderRoot(section, sliderDefinition.identity);

  // Deep individual slide extraction for banner sliders & frenzy deal widgets
  if (
    sliderDefinition.type === "ad-banner-slider" ||
    sliderDefinition.type === "frenzy-deal-slider"
  ) {
    const bannerCaptures = await captureIndividualAdBanners(page, section, sliderRoot, {
      sectionDirectory,
      sectionNumber,
      originalIndex,
      sectionId,
      moduleName,
      moduleType,
    });

    if (bannerCaptures.length > 0) return bannerCaptures;
  }

  const captures = [];
  const seenHashes = new Set();

  const saveState = async () => {
    const capture = await saveSliderState(page, section, {
      sectionDirectory,
      sectionNumber,
      originalIndex,
      sectionId,
      moduleName,
      moduleType,
      stateNumber: captures.length + 1,
      seenHashes,
    });

    if (capture) {
      captures.push(capture);
    }
    return capture;
  };

  const initialSwiperState = await getSwiperState(sliderRoot);

  if (initialSwiperState.found) {
    await resetSwiper(sliderRoot);
    await page.waitForTimeout(sliderTransitionWait);

    if (initialSwiperState.loop && initialSwiperState.realSlideIndexes.length > 0) {
      for (
        let index = 0;
        index < initialSwiperState.realSlideIndexes.length && index < maximumSliderStates;
        index++
      ) {
        await moveSwiperToRealIndex(sliderRoot, initialSwiperState.realSlideIndexes[index]);
        await page.waitForTimeout(sliderTransitionWait);
        await saveState();
      }
      return captures;
    }

    for (let state = 1; state <= maximumSliderStates; state++) {
      const capture = await saveState();
      const currentState = await getSwiperState(sliderRoot);

      if (!capture || !currentState.found || currentState.isEnd) break;

      const movement = await advanceSwiper(sliderRoot);
      if (!movement.moved) break;

      await page.waitForTimeout(sliderTransitionWait);
    }
    return captures;
  }

  const nextButton = await findNextButton(section);

  if (nextButton) {
    for (let state = 1; state <= maximumSliderStates; state++) {
      const capture = await saveState();
      const currentNextButton = await findNextButton(section);

      if (!capture || !currentNextButton || (await isNextButtonDisabled(currentNextButton))) {
        break;
      }

      const clicked = await clickNextButton(currentNextButton);
      if (!clicked) break;

      await page.waitForTimeout(sliderTransitionWait);
    }
    return captures;
  }

  const horizontalScroller = await findHorizontalScroller(sliderRoot);

  if (horizontalScroller) {
    await horizontalScroller.evaluate((element) => {
      element.scrollLeft = 0;
    });

    for (let state = 1; state <= maximumSliderStates; state++) {
      const capture = await saveState();
      if (!capture) break;

      const movement = await advanceHorizontalScroller(horizontalScroller);
      if (!movement.moved) break;

      await page.waitForTimeout(sliderTransitionWait);
    }
    return captures;
  }

  await saveState();
  return captures;
}

async function captureModuleSections(page, sectionDirectory) {
  await dismissCookieBanner(page);

  // WILDCARD LOCATOR: Captures v-sensor components, frenzy deals, category icons, and widget wrappers
  const sectionSelector = [
    'div[id^="v-sensor-component-"][id*="-module-"]',
    'div[id*="frenzyDealModule"]',
    'div[data-qa*="widget_"]',
    'div[id*="-module-"]',
    'div[class*="widget_"]',
    'section[class*="module"]'
  ].join(",");

  const sections = page.locator(sectionSelector);
  const totalSections = await sections.count();
  const captures = [];

  for (let index = 0; index < totalSections; index++) {
    const section = sections.nth(index);

    // Trigger IntersectionObserver so lazy-loaded items render
    await section.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);

    if (!(await section.isVisible().catch(() => false))) continue;

    const rawId = await section.getAttribute("id");
    const dataQa = await section.getAttribute("data-qa");
    const sectionId = rawId || dataQa || `module-${index}`;

    const moduleName = sectionId
      .replace(/^v-sensor-component-\d+-\d+-module-/, "")
      .replace(/^widget_/, "");

    const moduleType = identifyModuleType(sectionId);
    const sliderDefinition = await detectSpecialSlider(section, sectionId);

    // Deep extraction for sliders or specialized widget containers
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

      for (const capture of sliderCaptures) {
        captures.push({ order: captures.length + 1, ...capture });
      }
      continue;
    }

    await waitForModuleImages(section);

    const boundingBox = await section.boundingBox();
    if (!boundingBox || boundingBox.width < 100 || boundingBox.height < 40) continue;

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

async function captureTargetUrl(browser, targetUrl, urlFolderName, urlNumber, totalUrls) {
  const urlScreenshotDirectory = path.join(screenshotRootDirectory, urlFolderName);
  const sectionDirectory = path.join(urlScreenshotDirectory, "sections");
  await fs.mkdir(sectionDirectory, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "Asia/Riyadh",
    extraHTTPHeaders: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
    bypassCSP: true,
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const page = await context.newPage();

  console.log(`\n[${urlNumber}/${totalUrls}] Capturing: ${targetUrl}`);

  try {
    let response;

    try {
      response = await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
    } catch {
      console.warn("Retrying navigation with commit state...");
      response = await page.goto(targetUrl, {
        waitUntil: "commit",
        timeout: 45000,
      });
    }

    await page.waitForTimeout(4000);
    await dismissCookieBanner(page);

    console.log("Scrolling through full page...");
    const scrollResult = await autoScroll(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    await dismissCookieBanner(page);

    const fullPageScreenshotPath = path.join(urlScreenshotDirectory, "full-page-result.png");

    await page.screenshot({
      path: fullPageScreenshotPath,
      fullPage: true,
      animations: "disabled",
    });

    console.log("Capturing individual widgets and module banners...");

    const moduleResult = await captureModuleSections(page, sectionDirectory);

    const result = {
      targetUrl,
      urlFolderName,
      status: response?.status(),
      finalUrl: page.url(),
      title: await page.title(),
      scrollSteps: scrollResult.scrollSteps,
      pageHeight: scrollResult.pageHeight,
      fullPageScreenshot: fullPageScreenshotPath,
      sectionDirectory,
      modulesFound: moduleResult.totalSections,
      moduleScreenshotsSaved: moduleResult.captures.length,
      captures: moduleResult.captures,
    };

    const reportPath = path.join(urlScreenshotDirectory, "capture-results.json");
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2), "utf8");

    return {
      success: true,
      reportPath,
      ...result,
    };
  } catch (error) {
    console.error(`Capture failed for ${targetUrl}:`, error.message);

    return {
      success: false,
      targetUrl,
      urlFolderName,
      error: error.message,
    };
  } finally {
    await context.close();
  }
}

// MAIN EXPORTED FUNCTION (Executed on API Request)
export async function runPreflightScan(inputUrl) {
  const targetUrls = [inputUrl || "https://www.noon.com/uae-en/"];

  await fs.mkdir(screenshotRootDirectory, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-http2",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--ignore-certificate-errors",
    ],
  });

  const allResults = [];
  const usedFolderNames = new Map();

  try {
    for (let index = 0; index < targetUrls.length; index++) {
      const targetUrl = targetUrls[index];

      let baseFolderName = createUrlFolderName(targetUrl);
      const duplicateCount = usedFolderNames.get(baseFolderName) || 0;

      usedFolderNames.set(baseFolderName, duplicateCount + 1);

      const urlFolderName = duplicateCount
        ? `${baseFolderName}-${duplicateCount + 1}`
        : baseFolderName;

      const result = await captureTargetUrl(
        browser,
        targetUrl,
        urlFolderName,
        index + 1,
        targetUrls.length
      );

      allResults.push(result);
    }
  } finally {
    await browser.close();
  }

  return allResults;
}