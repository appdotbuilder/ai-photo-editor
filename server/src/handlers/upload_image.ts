import { db } from '../db';
import { imagesTable } from '../db/schema';
import { type UploadImageInput, type Image } from '../schema';

export const uploadImage = async (input: UploadImageInput): Promise<Image> => {
  try {
    // Insert image record into database
    const result = await db.insert(imagesTable)
      .values({
        filename: input.filename,
        original_filename: input.original_filename,
        file_path: input.file_path,
        file_size: input.file_size,
        mime_type: input.mime_type,
        width: input.width,
        height: input.height
      })
      .returning()
      .execute();

    // Return the created image record
    const image = result[0];
    return {
      id: image.id,
      filename: image.filename,
      original_filename: image.original_filename,
      file_path: image.file_path,
      file_size: image.file_size,
      mime_type: image.mime_type,
      width: image.width,
      height: image.height,
      created_at: image.created_at,
      updated_at: image.updated_at
    };
  } catch (error) {
    console.error('Image upload failed:', error);
    throw error;
  }
};