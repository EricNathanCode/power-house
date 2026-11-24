/* Uploaded photos (product photos by staff, trade-in photos by customers).
   The body is the image file itself. We only take JPEG, PNG or WebP, and we check the first bytes of the file
   so a renamed .exe or .html can't be stored as an "image". */
const express = require("express");
const { ApiError } = require("./errors");

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const looksLike = (b, mime) =>
  (mime === "image/jpeg" && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
  (mime === "image/png" && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
  (mime === "image/webp" && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP");

/* middleware: read the image body (up to 3 MB) */
const readImage = express.raw({ type: IMAGE_TYPES, limit: "3mb" });

/* -> { mime, data } or a 400 error */
function imageFrom(req) {
  const mime = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const data = req.body;
  if (!IMAGE_TYPES.includes(mime) || !Buffer.isBuffer(data) || data.length < 100) throw new ApiError(400, "BAD_IMAGE", "Upload a JPG, PNG or WebP photo.");
  if (!looksLike(data, mime)) throw new ApiError(400, "BAD_IMAGE", "That file is not a real JPG, PNG or WebP image.");
  return { mime, data };
}

module.exports = { IMAGE_TYPES, readImage, imageFrom };
