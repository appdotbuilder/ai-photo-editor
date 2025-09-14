import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { imagesTable, aiOperationsTable } from '../db/schema';
import { getOperationResult } from '../handlers/get_operation_result';

describe('getOperationResult', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return operation result when operation exists', async () => {
    // Create a test image first
    const imageResult = await db.insert(imagesTable)
      .values({
        filename: 'test-image.jpg',
        original_filename: 'original-test-image.jpg',
        file_path: '/uploads/test-image.jpg',
        file_size: 1024000,
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080
      })
      .returning()
      .execute();

    const imageId = imageResult[0].id;

    // Create a test AI operation
    const operationResult = await db.insert(aiOperationsTable)
      .values({
        image_id: imageId,
        operation_type: 'object_removal',
        status: 'completed',
        prompt: 'Remove the person from the image',
        mask_data: '{"coordinates": [{"x": 100, "y": 150}]}',
        parameters: '{"inpaint_strength": 0.8}',
        result_image_path: '/results/processed-image.jpg',
        error_message: null,
        processing_time: 15.5
      })
      .returning()
      .execute();

    const operationId = operationResult[0].id;

    // Test getting the operation result
    const result = await getOperationResult(operationId);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(operationId);
    expect(result!.image_id).toEqual(imageId);
    expect(result!.operation_type).toEqual('object_removal');
    expect(result!.status).toEqual('completed');
    expect(result!.prompt).toEqual('Remove the person from the image');
    expect(result!.mask_data).toEqual('{"coordinates": [{"x": 100, "y": 150}]}');
    expect(result!.parameters).toEqual('{"inpaint_strength": 0.8}');
    expect(result!.result_image_path).toEqual('/results/processed-image.jpg');
    expect(result!.error_message).toBeNull();
    expect(result!.processing_time).toEqual(15.5);
    expect(typeof result!.processing_time).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when operation does not exist', async () => {
    const result = await getOperationResult(999);
    expect(result).toBeNull();
  });

  it('should handle pending operations correctly', async () => {
    // Create a test image
    const imageResult = await db.insert(imagesTable)
      .values({
        filename: 'pending-image.jpg',
        original_filename: 'original-pending-image.jpg',
        file_path: '/uploads/pending-image.jpg',
        file_size: 512000,
        mime_type: 'image/jpeg',
        width: 1024,
        height: 768
      })
      .returning()
      .execute();

    // Create a pending operation
    const operationResult = await db.insert(aiOperationsTable)
      .values({
        image_id: imageResult[0].id,
        operation_type: 'style_transfer',
        status: 'pending',
        prompt: 'Apply Van Gogh style',
        mask_data: null,
        parameters: '{"style_strength": 0.7}',
        result_image_path: null,
        error_message: null,
        processing_time: null
      })
      .returning()
      .execute();

    const result = await getOperationResult(operationResult[0].id);

    expect(result).toBeDefined();
    expect(result!.status).toEqual('pending');
    expect(result!.result_image_path).toBeNull();
    expect(result!.processing_time).toBeNull();
    expect(result!.error_message).toBeNull();
  });

  it('should handle failed operations with error messages', async () => {
    // Create a test image
    const imageResult = await db.insert(imagesTable)
      .values({
        filename: 'failed-image.jpg',
        original_filename: 'original-failed-image.jpg',
        file_path: '/uploads/failed-image.jpg',
        file_size: 256000,
        mime_type: 'image/jpeg',
        width: 800,
        height: 600
      })
      .returning()
      .execute();

    // Create a failed operation
    const operationResult = await db.insert(aiOperationsTable)
      .values({
        image_id: imageResult[0].id,
        operation_type: 'image_modification',
        status: 'failed',
        prompt: 'Change the sky color to purple',
        mask_data: '{"coordinates": []}',
        parameters: '{"modification_strength": 0.9}',
        result_image_path: null,
        error_message: 'GPU out of memory error during processing',
        processing_time: 8.2
      })
      .returning()
      .execute();

    const result = await getOperationResult(operationResult[0].id);

    expect(result).toBeDefined();
    expect(result!.status).toEqual('failed');
    expect(result!.error_message).toEqual('GPU out of memory error during processing');
    expect(result!.result_image_path).toBeNull();
    expect(result!.processing_time).toEqual(8.2);
    expect(typeof result!.processing_time).toBe('number');
  });

  it('should handle processing operations correctly', async () => {
    // Create a test image
    const imageResult = await db.insert(imagesTable)
      .values({
        filename: 'processing-image.jpg',
        original_filename: 'original-processing-image.jpg',
        file_path: '/uploads/processing-image.jpg',
        file_size: 2048000,
        mime_type: 'image/jpeg',
        width: 2048,
        height: 1536
      })
      .returning()
      .execute();

    // Create a processing operation
    const operationResult = await db.insert(aiOperationsTable)
      .values({
        image_id: imageResult[0].id,
        operation_type: 'object_removal',
        status: 'processing',
        prompt: null,
        mask_data: '{"mask_path": "/masks/selection.png"}',
        parameters: '{"inpaint_strength": 0.9, "guidance_scale": 10}',
        result_image_path: null,
        error_message: null,
        processing_time: null
      })
      .returning()
      .execute();

    const result = await getOperationResult(operationResult[0].id);

    expect(result).toBeDefined();
    expect(result!.status).toEqual('processing');
    expect(result!.prompt).toBeNull();
    expect(result!.result_image_path).toBeNull();
    expect(result!.processing_time).toBeNull();
    expect(result!.error_message).toBeNull();
  });

  it('should handle operations with null processing time correctly', async () => {
    // Create a test image
    const imageResult = await db.insert(imagesTable)
      .values({
        filename: 'null-time-image.jpg',
        original_filename: 'original-null-time-image.jpg',
        file_path: '/uploads/null-time-image.jpg',
        file_size: 1024000,
        mime_type: 'image/jpeg',
        width: 1920,
        height: 1080
      })
      .returning()
      .execute();

    // Create an operation with null processing time
    const operationResult = await db.insert(aiOperationsTable)
      .values({
        image_id: imageResult[0].id,
        operation_type: 'style_transfer',
        status: 'completed',
        prompt: 'Apply artistic style',
        mask_data: null,
        parameters: '{"style_strength": 0.5}',
        result_image_path: '/results/styled-image.jpg',
        error_message: null,
        processing_time: null
      })
      .returning()
      .execute();

    const result = await getOperationResult(operationResult[0].id);

    expect(result).toBeDefined();
    expect(result!.processing_time).toBeNull();
    expect(result!.status).toEqual('completed');
    expect(result!.result_image_path).toEqual('/results/styled-image.jpg');
  });
});