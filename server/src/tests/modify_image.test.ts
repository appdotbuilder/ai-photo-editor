import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { aiOperationsTable, imagesTable } from '../db/schema';
import { type ImageModificationInput } from '../schema';
import { modifyImage } from '../handlers/modify_image';
import { eq } from 'drizzle-orm';

// Test input for image modification
const testImageModificationInput: ImageModificationInput = {
  image_id: 1,
  prompt: 'Change the sky to sunset colors',
  mask_data: JSON.stringify({ coordinates: [[100, 50], [400, 200]] }),
  parameters: {
    modification_strength: 0.8,
    guidance_scale: 7.5,
    num_inference_steps: 50
  }
};

// Test input without mask data (global modification)
const globalModificationInput: ImageModificationInput = {
  image_id: 1,
  prompt: 'Make the image look vintage',
  parameters: {
    modification_strength: 0.6,
    guidance_scale: 8.0,
    num_inference_steps: 40
  }
};

// Test input with minimal parameters (using defaults)
const minimalInput: ImageModificationInput = {
  image_id: 1,
  prompt: 'Add more contrast to the image'
};

describe('modifyImage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test image
  const createTestImage = async () => {
    const result = await db.insert(imagesTable)
      .values({
        filename: 'test-image.jpg',
        original_filename: 'original-test.jpg',
        file_path: '/uploads/test-image.jpg',
        file_size: 1024000,
        mime_type: 'image/jpeg',
        width: 800,
        height: 600
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should create an image modification operation with mask data', async () => {
    await createTestImage();

    const result = await modifyImage(testImageModificationInput);

    // Verify operation fields
    expect(result.image_id).toEqual(1);
    expect(result.operation_type).toEqual('image_modification');
    expect(result.status).toEqual('pending');
    expect(result.prompt).toEqual('Change the sky to sunset colors');
    expect(result.mask_data).toEqual(JSON.stringify({ coordinates: [[100, 50], [400, 200]] }));
    expect(result.parameters).toEqual(JSON.stringify({
      modification_strength: 0.8,
      guidance_scale: 7.5,
      num_inference_steps: 50
    }));
    expect(result.result_image_path).toBeNull();
    expect(result.error_message).toBeNull();
    expect(result.processing_time).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a global modification operation without mask data', async () => {
    await createTestImage();

    const result = await modifyImage(globalModificationInput);

    expect(result.image_id).toEqual(1);
    expect(result.operation_type).toEqual('image_modification');
    expect(result.status).toEqual('pending');
    expect(result.prompt).toEqual('Make the image look vintage');
    expect(result.mask_data).toBeNull();
    expect(result.parameters).toEqual(JSON.stringify({
      modification_strength: 0.6,
      guidance_scale: 8.0,
      num_inference_steps: 40
    }));
  });

  it('should create operation with minimal input (no parameters)', async () => {
    await createTestImage();

    const result = await modifyImage(minimalInput);

    expect(result.image_id).toEqual(1);
    expect(result.operation_type).toEqual('image_modification');
    expect(result.status).toEqual('pending');
    expect(result.prompt).toEqual('Add more contrast to the image');
    expect(result.mask_data).toBeNull();
    expect(result.parameters).toBeNull();
  });

  it('should save operation to database correctly', async () => {
    await createTestImage();

    const result = await modifyImage(testImageModificationInput);

    // Query the operation from database
    const operations = await db.select()
      .from(aiOperationsTable)
      .where(eq(aiOperationsTable.id, result.id))
      .execute();

    expect(operations).toHaveLength(1);
    const savedOperation = operations[0];
    
    expect(savedOperation.image_id).toEqual(1);
    expect(savedOperation.operation_type).toEqual('image_modification');
    expect(savedOperation.status).toEqual('pending');
    expect(savedOperation.prompt).toEqual('Change the sky to sunset colors');
    expect(savedOperation.mask_data).toEqual(JSON.stringify({ coordinates: [[100, 50], [400, 200]] }));
    expect(savedOperation.parameters).toEqual(JSON.stringify({
      modification_strength: 0.8,
      guidance_scale: 7.5,
      num_inference_steps: 50
    }));
    expect(savedOperation.result_image_path).toBeNull();
    expect(savedOperation.error_message).toBeNull();
    expect(savedOperation.processing_time).toBeNull();
    expect(savedOperation.created_at).toBeInstanceOf(Date);
    expect(savedOperation.updated_at).toBeInstanceOf(Date);
  });

  it('should handle numeric processing_time conversion correctly', async () => {
    await createTestImage();

    const result = await modifyImage(testImageModificationInput);

    // Verify processing_time is null initially
    expect(result.processing_time).toBeNull();
    expect(typeof result.processing_time).toBe('object'); // null is object type

    // Simulate updating with processing time
    const updatedOperation = await db.update(aiOperationsTable)
      .set({ 
        processing_time: 15.5,
        status: 'completed'
      })
      .where(eq(aiOperationsTable.id, result.id))
      .returning()
      .execute();

    // Verify numeric conversion would work
    const processingTime = updatedOperation[0].processing_time;
    expect(processingTime).toBeDefined();
    if (processingTime !== null) {
      expect(typeof processingTime).toBe('number');
      expect(processingTime).toEqual(15.5);
    }
  });

  it('should throw error when image does not exist', async () => {
    // Don't create test image - test with non-existent image_id

    await expect(modifyImage(testImageModificationInput))
      .rejects
      .toThrow(/Image with id 1 not found/i);
  });

  it('should handle different parameter combinations', async () => {
    await createTestImage();

    // Test with custom parameters
    const customInput: ImageModificationInput = {
      image_id: 1,
      prompt: 'Apply sepia effect',
      parameters: {
        modification_strength: 0.9,
        guidance_scale: 12.0,
        num_inference_steps: 75
      }
    };

    const result = await modifyImage(customInput);

    expect(result.prompt).toEqual('Apply sepia effect');
    expect(result.parameters).toEqual(JSON.stringify({
      modification_strength: 0.9,
      guidance_scale: 12.0,
      num_inference_steps: 75
    }));
  });

  it('should handle mask_data as null when not provided', async () => {
    await createTestImage();

    const inputWithoutMask: ImageModificationInput = {
      image_id: 1,
      prompt: 'Increase brightness globally'
    };

    const result = await modifyImage(inputWithoutMask);

    expect(result.mask_data).toBeNull();
    expect(result.prompt).toEqual('Increase brightness globally');
  });

  it('should create multiple operations for the same image', async () => {
    await createTestImage();

    const firstResult = await modifyImage({
      image_id: 1,
      prompt: 'First modification'
    });

    const secondResult = await modifyImage({
      image_id: 1,
      prompt: 'Second modification'
    });

    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.image_id).toEqual(secondResult.image_id);
    expect(firstResult.prompt).toEqual('First modification');
    expect(secondResult.prompt).toEqual('Second modification');

    // Verify both are in database
    const operations = await db.select()
      .from(aiOperationsTable)
      .where(eq(aiOperationsTable.image_id, 1))
      .execute();

    expect(operations).toHaveLength(2);
  });
});