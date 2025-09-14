import { db } from '../db';
import { aiOperationsTable, imagesTable } from '../db/schema';
import { type StyleTransferInput, type AIOperation } from '../schema';
import { eq } from 'drizzle-orm';

export const applyStyleTransfer = async (input: StyleTransferInput): Promise<AIOperation> => {
  try {
    // Verify that the referenced image exists
    const existingImage = await db.select()
      .from(imagesTable)
      .where(eq(imagesTable.id, input.image_id))
      .execute();

    if (existingImage.length === 0) {
      throw new Error(`Image with id ${input.image_id} not found`);
    }

    // Prepare parameters JSON string
    const parametersJson = input.parameters ? JSON.stringify(input.parameters) : null;

    // Insert AI operation record with pending status
    const result = await db.insert(aiOperationsTable)
      .values({
        image_id: input.image_id,
        operation_type: 'style_transfer',
        status: 'pending',
        prompt: input.prompt,
        mask_data: null, // Style transfer applies to entire image, no mask needed
        parameters: parametersJson,
        result_image_path: null, // Will be set when processing completes
        error_message: null,
        processing_time: null // Will be set when processing completes
      })
      .returning()
      .execute();

    // Convert numeric fields if any (processing_time is real type)
    const operation = result[0];
    return {
      ...operation,
      processing_time: operation.processing_time ? parseFloat(operation.processing_time.toString()) : null
    };
  } catch (error) {
    console.error('Style transfer operation creation failed:', error);
    throw error;
  }
};