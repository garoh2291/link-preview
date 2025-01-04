import { NextRequest, NextResponse } from "next/server";
import { chromium } from "@playwright/test";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/utils/s3";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ message: "URL is required" }, { status: 400 });
    }

    // Launch browser
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }, // Set default viewport
    });
    const page = await context.newPage();

    // Navigate to the URL and wait for network idle
    await page.goto(url, { waitUntil: "networkidle" });

    // Take full page screenshot
    const screenshot = await page.screenshot({
      fullPage: true, // This captures the full scrollable page
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
      { message: "Failed to capture screenshot" },
      { status: 500 }
    );
  }
}
