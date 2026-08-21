/**
 * Image Processing Task Handler
 * Simulates image resize, watermark, and thumbnail generation
 */
async function processImageTask(payload, simulateFailure) {
  const imageUrl = payload.imageUrl || 'https://example.com/avatar.jpg';
  const width = payload.width || 300;
  const height = payload.height || 300;

  console.log(`  [Image Handler] Resizing image: ${imageUrl} to ${width}x${height}...`);

  // Simulate CPU image processing delay (1200ms)
  await new Promise((resolve) => setTimeout(resolve, 1200));

  if (simulateFailure) {
    throw new Error(`Out of Memory: Image dimension ${width}x${height} too large (Simulated Failure)`);
  }

  return {
    processed: true,
    originalUrl: imageUrl,
    thumbnailUrl: `${imageUrl}_thumb_${width}x${height}.jpg`,
    dimensions: `${width}x${height}`,
    bytesSaved: '42.5 KB',
    processedAt: new Date().toISOString(),
  };
}

module.exports = processImageTask;
