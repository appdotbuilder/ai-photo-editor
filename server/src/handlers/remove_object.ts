import { db } from '../db';
import { aiOperationsTable, imagesTable } from '../db/schema';
import { type ObjectRemovalInput, type AIOperation } from '../schema';
import { eq } from 'drizzle-orm';

export const removeObject = async (input: ObjectRemovalInput): Promise<AIOperation> => {
  try {
    // First verify that the image exists
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
        operation_type: 'object_removal',
        status: 'pending',
        prompt: null, // Object removal typically doesn't need a text prompt
        mask_data: input.mask_data,
        parameters: parametersJson,
        result_image_path: null, // Will be set when processing completes
        error_message: null,
        processing_time: null
      })
      .returning()
      .execute();

    const operation = result[0];

    // Convert numeric fields if any (processing_time is real/numeric)
    return {
      ...operation,
      processing_time: operation.processing_time ? parseFloat(operation.processing_time.toString()) : null
    };
  } catch (error) {
    console.error('Object removal operation creation failed:', error);
    throw error;
  }
};