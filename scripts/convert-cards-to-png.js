#!/usr/bin/env node

import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const inputDir = path.join(projectRoot, "assets", "cards");
const outputDir = path.join(projectRoot, "assets", "cards-png");

await mkdir(outputDir, { recursive: true });

const files = await readdir(inputDir, { withFileTypes: true });
const svgFiles = files
  .filter((file) => file.isFile() && path.extname(file.name).toLowerCase() === ".svg")
  .map((file) => file.name)
  .sort();

await Promise.all(
  svgFiles.map(async (fileName) => {
    const inputPath = path.join(inputDir, fileName);
    const outputPath = path.join(outputDir, `${path.basename(fileName, ".svg")}.png`);

    await sharp(inputPath).png().toFile(outputPath);
  }),
);

console.log(`Converted ${svgFiles.length} SVG files to ${outputDir}`);
