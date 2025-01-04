import { NextRequest, NextResponse } from "next/server";
import { chromium } from "@playwright/test";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/utils/s3";
import chromiumPath from "@sparticuz/chromium";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    // Get the proper executable path based on environment
    const executablePath =
      process.env.NODE_ENV === "development"
        ? undefined
        : await chromiumPath.executablePath();

    // Launch browser with specific configurations for Vercel
    const browser = await chromium.launch({
      headless: true,
      executablePath,
      args: [
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-sandbox",
      ],
    });

    // Create new context with viewport
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    // Create new page
    const page = await context.newPage();

    try {
      // Navigate to URL with timeout
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Take full page screenshot
      const screenshot = await page.screenshot({
        fullPage: true,
        type: "png",
      });

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

      // Generate S3 URL
      const screenshotUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

      return NextResponse.json({
        message: "Screenshot captured successfully",
        url: screenshotUrl,
      });
    } finally {
      // Make sure browser is closed even if there's an error
      await browser.close();
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
  }
}
