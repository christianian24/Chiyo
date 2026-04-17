import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import sharp from 'sharp';

export async function saveCoverImage(tempFilePath: string): Promise<string> {
  if (!tempFilePath) return '';

  const userDataPath = app.getPath('userData');
  const coversPath = path.join(userDataPath, 'covers');
  
  // Ensure directory exists
  if (!fs.existsSync(coversPath)) {
    fs.mkdirSync(coversPath, { recursive: true });
  }

  // Generate unique filename and temporary path
  const fileName = `${Date.now()}.webp`;
  const targetPath = path.join(coversPath, fileName);
  const tempPath = path.join(coversPath, `${fileName}.tmp`);

  try {
    // Process image: Resize (max 400x600) + Convert to WebP
    await sharp(tempFilePath)
      .resize(400, 600, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(tempPath);

    // Atomic rename
    fs.renameSync(tempPath, targetPath);

    return fileName;
  } catch (error) {
    // Cleanup temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    console.error('Image processing failed:', error);
    throw error;
  }
}

export function getCoverPath(fileName: string): string {
  if (!fileName) return '';
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'covers', fileName);
}

export function deleteCoverImage(fileName: string) {
  if (!fileName) return;
  
  // Extract only the filename in case a URL or full path was passed
  const baseName = path.basename(fileName);
  const fullPath = getCoverPath(baseName);
  
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Successfully deleted cover: ${baseName}`);
    }
  } catch (error) {
    console.error(`Failed to delete cover ${baseName}:`, error);
  }
}
