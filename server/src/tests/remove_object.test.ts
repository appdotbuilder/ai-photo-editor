import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { imagesTable, aiOperationsTable } from '../db/schema';
import { type ObjectRemovalInput } from '../schema';
import { removeObject } from '../handlers/remove_object';
import { eq } from 'drizzle-orm';

// Test input data
const testImageData = {
  filename: 'test-image.jpg',
  original_filename: 'original-test.jpg',
  file_path: '/uploads/test-image.jpg',
  file_size: 1024000,
  mime_type: 'image/jpeg',
  width: 1920,
  height: 1080
};

const testMaskData = JSON.stringify({
  type: 'polygon',
  coordinates: [[100, 100], [200, 100], [200, 200], [100, 200]]
});

describe('removeObject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an object removal operation with default parameters', async () => {
    // Create test image first
    const imageResult = await db.insert(imagesTable)
      .values(testImageData)
      .returning()
      .execute();
    
    const testImage = imageResult[0];

    const input: ObjectRemovalInput = {
      image_id: testImage.id,
      mask_data: testMaskData
    };

    const result = await removeObject(input);

    // Validate returned operation
    expect(result.id).toBeDefined();
    expect(result.image_id).toEqual(testImage.id);
    expect(result.operation_type).toEqual('object_removal');
    expect(result.status).toEqual('pending');
    expect(result.prompt).toBeNull();
    expect(result.mask_data).toEqual(testMaskData);
    expect(result.parameters).toBeNull();
    expect(result.result_image_path).toBeNull();
    expect(result.error_message).toBeNull();
    expect(result.processing_time).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an object removal operation with custom parameters', async () => {
    // Create test image first
    const imageResult = await db.insert(imagesTable)
      .values(testImageData)
      .returning()
      .execute();
    
    const testImage = imageResult[0];

    const input: ObjectRemovalInput = {
      image_id: testImage.id,
      mask_data: testMaskData,
      parameters: {
        inpaint_strength: 0.9,
        guidance_scale: 10.0
      }
    };

    const result = await removeObject(input);

    // Validate parameters were stored correctly
    expect(result.parameters).toBeDefined();
    const storedParams = JSON.parse(result.parameters!);
    expect(storedParams.inpaint_strength).toEqual(0.9);
    expect(storedParams.guidance_scale).toEqual(10.0);
    expect(result.mask_data).toEqual(testMaskData);
  });

  it('should save operation to database correctly', async () => {
    // Create test image first
    const imageResult = await db.insert(imagesTable)
      .values(testImageData)
      .returning()
      .execute();
    
    const testImage = imageResult[0];

    const input: ObjectRemovalInput = {
      image_id: testImage.id,
      mask_data: testMaskData,
      parameters: {
        inpaint_strength: 0.8,
        guidance_scale: 7.5
      }
    };

    const result = await removeObject(input);

    // Query database to verify operation was saved
    const operations = await db.select()
      .from(aiOperationsTable)
      .where(eq(aiOperationsTable.id, result.id))
      .execute();

    expect(operations).toHaveLength(1);
    const savedOperation = operations[0];
    
    expect(savedOperation.image_id).toEqual(testImage.id);
    expect(savedOperation.operation_type).toEqual('object_removal');
    expect(savedOperation.status).toEqual('pending');
    expect(savedOperation.mask_data).toEqual(testMaskData);
    expect(savedOperation.parameters).toBeDefined();
    
    const savedParams = JSON.parse(savedOperation.parameters!);
    expect(savedParams.inpaint_strength).toEqual(0.8);
    expect(savedParams.guidance_scale).toEqual(7.5);
  });

  it('should throw error when image does not exist', async () => {
    const input: ObjectRemovalInput = {
      image_id: 99999, // Non-existent image ID
      mask_data: testMaskData
    };

    await expect(removeObject(input)).rejects.toThrow(/Image with id 99999 not found/i);
  });

  it('should handle complex mask data structures', async () => {
    // Create test image first
    const imageResult = await db.insert(imagesTable)
      .values(testImageData)
      .returning()
      .execute();
    
    const testImage = imageResult[0];

    const complexMaskData = JSON.stringify({
      type: 'multiple_polygons',
      regions: [
        {
          id: 1,
          coordinates: [[50, 50], [150, 50], [150, 150], [50, 150]]
        },
        {
          id: 2,
          coordinates: [[200, 200], [300, 200], [300, 300], [200, 300]]
        }
      ],
      metadata: {
        tool: 'polygon_select',
        version: '1.0'
      }
    });

    const input: ObjectRemovalInput = {
      image_id: testImage.id,
      mask_data: complexMaskData
    };

    const result = await removeObject(input);

    expect(result.mask_data).toEqual(complexMaskData);
    
    // Verify it was saved correctly to database
    const operations = await db.select()
      .from(aiOperationsTable)
      .where(eq(aiOperationsTable.id, result.id))
      .execute();

    expect(operations[0].mask_data).toEqual(complexMaskData);
  });

  it('should handle edge case with minimal parameters', async () => {
    // Create test image first
    const imageResult = await db.insert(imagesTable)
      .values(testImageData)
      .returning()
      .execute();
    
    const testImage = imageResult[0];

    const input: ObjectRemovalInput = {
      image_id: testImage.id,
      mask_data: '{"type":"simple","x":100,"y":100,"width":50,"height":50}'
    };

    const result = await removeObject(input);

    expect(result.image_id).toEqual(testImage.id);
    expect(result.operation_type).toEqual('object_removal');
    expect(result.status).toEqual('pending');
    expect(result.parameters).toBeNull();
    expect(typeof result.mask_data).toEqual('string');
  });
});