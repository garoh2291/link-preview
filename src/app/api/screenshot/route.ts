import { NextRequest, NextResponse } from "next/server";
import { chromium } from "@playwright/test";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/utils/s3";

export const maxDuration = 300; // This will set the maxDuration to 300 seconds

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    // Launch browser with specific configurations for Vercel
    const browser = await chromium.launch({
      headless: true,
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

    // Close browser
    await browser.close();

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
