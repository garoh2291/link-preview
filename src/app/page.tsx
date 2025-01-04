"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setScreenshot(null);

    try {
      const response = await fetch("/api/screenshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to capture screenshot");
      }

      const data = await response.json();
      setScreenshot(data.url);
      setUrl("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Website Screenshot Generator
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Website URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="w-full px-4 py-2 border text-black border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium
              ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
          >
            {isLoading ? "Capturing..." : "Capture Screenshot"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {screenshot && (
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold">Screenshot Preview</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-lg">
              <img
                src={screenshot}
                alt="Website screenshot"
                className="w-full h-auto"
              />
            </div>
            <a
              href={screenshot}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-blue-500 hover:text-blue-600"
            >
              Open full screenshot in new tab
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
