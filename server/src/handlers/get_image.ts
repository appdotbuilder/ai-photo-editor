import { db } from '../db';
import { imagesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Image } from '../schema';

export async function getImage(imageId: number): Promise<Image | null> {
  try {
    // Query the database for the image with the given ID
    const results = await db.select()
      .from(imagesTable)
      .where(eq(imagesTable.id, imageId))
      .execute();

    // Return null if image not found
    if (results.length === 0) {
      return null;
    }

    // Return the image record (no numeric conversions needed for this table)
    return results[0];
  } catch (error) {
    console.error('Image retrieval failed:', error);
    throw error;
  }
}