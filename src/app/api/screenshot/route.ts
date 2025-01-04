import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import type { Browser } from "playwright-core";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/utils/s3";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    if (process.env.NODE_ENV === "development") {
      // Local development setup
      const { chromium: playwrightChromium } = require("playwright");
      browser = await playwrightChromium.launch({
        headless: true,
      });

      const context = await browser?.newContext({
        viewport: { width: 1280, height: 720 },
      });
      const page = await context?.newPage();

      // Navigate to URL with timeout
      await page?.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Take full page screenshot
      const screenshot = await page?.screenshot({
        fullPage: true,
      });

      await context?.close();
      await browser?.close();

      // Generate unique filename with folder structure
      const filename = `link-preview/screenshot-${Date.now()}.png`;

      // Upload to S3
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
      const { default: puppeteer } = await import("puppeteer-core");
      //@ts-ignore
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: {
          width: 1280,
          height: 720,
          deviceScaleFactor: 1,
        },
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });

      const page = await browser?.newPage();

      // Navigate to URL with timeout
      await page?.goto(url, {
        //@ts-ignore
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Take full page screenshot
      const screenshot = await page?.screenshot({
        fullPage: true,
      });

      await browser?.close();

      // Generate unique filename with folder structure
      const filename = `link-preview/screenshot-${Date.now()}.png`;

      // Upload to S3
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
