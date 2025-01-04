import { NextRequest, NextResponse } from "next/server";
import type { Browser as PlaywrightBrowser } from "playwright";
import type { Browser as PuppeteerBrowser } from "puppeteer-core";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/utils/s3";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let browser: PlaywrightBrowser | PuppeteerBrowser | null = null;

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    if (process.env.NODE_ENV === "development") {
      // Local development setup
      const playwright = await import("playwright");
      browser = (await playwright.chromium.launch({
        headless: true,
      })) as PlaywrightBrowser;

      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      const page = await context.newPage();

      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      const screenshot = await page.screenshot({
        fullPage: true,
      });

      await context.close();
      await browser.close();

      const filename = `link-preview/screenshot-${Date.now()}.png`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: filename,
          Body: screenshot,
          ContentType: "image/png",
        })
      );

      const screenshotUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

      return NextResponse.json({
        message: "Screenshot captured successfully",
        url: screenshotUrl,
      });
    } else {
      // Production Vercel setup
      const chromium = await import("@sparticuz/chromium");
      const puppeteer = await import("puppeteer-core");

      const args = [
        "--autoplay-policy=user-gesture-required",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-client-side-phishing-detection",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-domain-reliability",
        "--disable-extensions",
        "--disable-features=AudioServiceOutOfProcess",
        "--disable-hang-monitor",
        "--disable-ipc-flooding-protection",
        "--disable-notifications",
        "--disable-offer-store-unmasked-wallet-cards",
        "--disable-popup-blocking",
        "--disable-print-preview",
        "--disable-prompt-on-repost",
        "--disable-renderer-backgrounding",
        "--disable-setuid-sandbox",
        "--disable-speech-api",
        "--disable-sync",
        "--hide-scrollbars",
        "--ignore-gpu-blacklist",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-first-run",
        "--no-pings",
        "--no-sandbox",
        "--no-zygote",
        "--password-store=basic",
        "--use-gl=swiftshader",
        "--use-mock-keychain",
      ];

      browser = (await puppeteer.default.launch({
        args,
        defaultViewport: {
          width: 1280,
          height: 720,
          deviceScaleFactor: 1,
        },
        executablePath: await chromium.default.executablePath(),
        headless: true,
        ignoreHTTPSErrors: true,
      })) as PuppeteerBrowser;

      const page = await browser.newPage();

      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      const screenshot = await page.screenshot({
        fullPage: true,
        type: "png",
      });

      await browser.close();

      const filename = `link-preview/screenshot-${Date.now()}.png`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: filename,
          Body: screenshot,
          ContentType: "image/png",
        })
      );

      const screenshotUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

      return NextResponse.json({
        message: "Screenshot captured successfully",
        url: screenshotUrl,
      });
    }
  } catch (error) {
    console.error("Screenshot error:", error);
    return NextResponse.json(
      {
        message:
          "Failed to capture screenshot: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
}
