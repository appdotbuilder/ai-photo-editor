import { db } from '../db';
import { aiOperationsTable, imagesTable } from '../db/schema';
import { type ImageModificationInput, type AIOperation } from '../schema';
import { eq } from 'drizzle-orm';

export const modifyImage = async (input: ImageModificationInput): Promise<AIOperation> => {
  try {
    // First verify that the referenced image exists
    const existingImages = await db.select()
      .from(imagesTable)
      .where(eq(imagesTable.id, input.image_id))
      .execute();

    if (existingImages.length === 0) {
      throw new Error(`Image with id ${input.image_id} not found`);
    }

    // Prepare parameters JSON
    const parametersJson = input.parameters ? JSON.stringify(input.parameters) : null;

    // Create AI operation record with 'pending' status
    const result = await db.insert(aiOperationsTable)
      .values({
        image_id: input.image_id,
        operation_type: 'image_modification',
        status: 'pending',
        prompt: input.prompt,
        mask_data: input.mask_data || null,
        parameters: parametersJson,
        result_image_path: null, // Will be set when processing completes
        error_message: null,
        processing_time: null // Will be set when processing completes
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers if needed
    const operation = result[0];
    return {
      ...operation,
      processing_time: operation.processing_time ? parseFloat(operation.processing_time.toString()) : null
    };
  } catch (error) {
    console.error('Image modification operation creation failed:', error);
    throw error;
  }
};