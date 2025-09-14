import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { imagesTable, aiOperationsTable } from '../db/schema';
import { type StyleTransferInput } from '../schema';
import { applyStyleTransfer } from '../handlers/apply_style_transfer';
import { eq } from 'drizzle-orm';

// Test image data
const testImageData = {
  filename: 'test-image.jpg',
  original_filename: 'original-test.jpg', 
  file_path: '/uploads/test-image.jpg',
  file_size: 1024000,
  mime_type: 'image/jpeg',
  width: 1920,
  height: 1080
};

// Test style transfer input with all fields
const testInput: StyleTransferInput = {
  image_id: 1, // Will be set after creating test image
  prompt: 'watercolor painting style',
  parameters: {
    style_strength: 0.8,
    guidance_scale: 8.0,
    num_inference_steps: 40
  }
};

describe('applyStyleTransfer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a style transfer operation', async () => {
    // Create prerequisite image first
    const imageResult = await db.insert(imagesTable)
      .values(testImageData)
      .returning()
      .execute();
    
    const imageId = imageResult[0].id;
    const inputWithValidImageId = { ...testInput, image_id: imageId };
    
    const result = await applyStyleTransfer(inputWithValidImageId);

    // Verify basic operation fields
    expect(result.image_id).toEqual(imageId);
    expect(result.operation_type).toEqual('style_transfer');
    expect(result.status).toEqual('pending');
    expect(result.prompt).toEqual('watercolor painting style');
    expect(result.mask_data).toBeNull(); // Style transfer doesn't use masks
    expect(result.result_image_path).toBeNull(); // Not set initially
    expect(result.error_message).toBeNull();
    expect(result.processing_time).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify parameters are properly serialized
    expect(result.parameters).toBeDefined();
    const parsedParams = JSON.parse(result.parameters!);
    expect(parsedParams.style_strength).toEqual(0.8);
    expect(parsedParams.guidance_scale).toEqual(8.0);
    expect(parsedParams.num_inference_steps).toEqual(40);
  });

  it('should save operation to database', async () => {
    // Create prerequisite image
    const imageResult = await db.insert(imagesTable)
      .values(testImageData)
      .returning()
      .execute();
    
    const imageId = imageResult[0].id;
    const inputWithValidImageId = { ...testInput, image_id: imageId };
    
    const result = await applyStyleTransfer(inputWithValidImageId);

    // Query database to verify operation was saved
    const operations = await db.select()
      .from(aiOperationsTable)
      .where(eq(aiOperationsTable.id, result.id))
      .execute();

    expect(operations).toHaveLength(1);
    expect(operations[0].image_id).toEqual(imageId);
    expect(operations[0].operation_type).toEqual('style_transfer');
    expect(operations[0].status).toEqual('pending');
    expect(operations[0].prompt).toEqual('watercolor painting style');
    expect(operations[0].created_at).toBeInstanceOf(Date);
    expect(operations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle input without parameters', async () => {
    // Create prerequisite image
    const imageResult = await db.insert(imagesTable)
      .values(testImageData)
      .returning()
      .execute();
    
    const imageId = imageResult[0].id;
    const inputWithoutParams: StyleTransferInput = {
      image_id: imageId,
      prompt: 'impressionist style painting'
    };
    
    const result = await applyStyleTransfer(inputWithoutParams);

    expect(result.image_id).toEqual(imageId);
    expect(result.operation_type).toEqual('style_transfer');
    expect(result.status).toEqual('pending');
    expect(result.prompt).toEqual('impressionist style painting');
    expect(result.parameters).toBeNull(); // No parameters provided
  });

  it('should handle input with partial parameters', async () => {
    // Create prerequisite image
    const imageResult = await db.insert(imagesTable)
      .values(testImageData)
      .returning()
      .execute();
    
    const imageId = imageResult[0].id;
    // Create input with partial parameters (TypeScript allows this since they're optional)
    const inputWithPartialParams = {
      image_id: imageId,
      prompt: 'oil painting style',
      parameters: {
        style_strength: 0.9 // Only provide one parameter
      }
    } as StyleTransferInput;
    
    const result = await applyStyleTransfer(inputWithPartialParams);

    expect(result.image_id).toEqual(imageId);
    expect(result.prompt).toEqual('oil painting style');
    expect(result.parameters).toBeDefined();
    
    const parsedParams = JSON.parse(result.parameters!);
    expect(parsedParams.style_strength).toEqual(0.9);
  });

  it('should throw error for non-existent image', async () => {
    const inputWithInvalidImageId: StyleTransferInput = {
      image_id: 99999, // Non-existent image ID
      prompt: 'abstract art style'
    };
    
    await expect(applyStyleTransfer(inputWithInvalidImageId))
      .rejects
      .toThrow(/image with id 99999 not found/i);
  });

  it('should handle different style prompts correctly', async () => {
    // Create prerequisite image
    const imageResult = await db.insert(imagesTable)
      .values(testImageData)
      .returning()
      .execute();
    
    const imageId = imageResult[0].id;
    
    const styles = [
      'cubist painting style',
      'renaissance art',
      'digital art with neon colors',
      'pencil sketch drawing'
    ];
    
    const operations = [];
    
    for (const style of styles) {
      const input: StyleTransferInput = {
        image_id: imageId,
        prompt: style
      };
      
      const result = await applyStyleTransfer(input);
      operations.push(result);
      expect(result.prompt).toEqual(style);
      expect(result.operation_type).toEqual('style_transfer');
      expect(result.status).toEqual('pending');
    }
    
    // Verify all operations were created
    expect(operations).toHaveLength(4);
    
    // Verify operations are saved in database
    const savedOperations = await db.select()
      .from(aiOperationsTable)
      .where(eq(aiOperationsTable.image_id, imageId))
      .execute();
      
    expect(savedOperations).toHaveLength(4);
  });
});