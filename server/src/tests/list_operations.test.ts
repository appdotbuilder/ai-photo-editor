import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { imagesTable, aiOperationsTable } from '../db/schema';
import { type UploadImageInput, type AIOperationType, type AIOperationStatus } from '../schema';
import { listOperations } from '../handlers/list_operations';

// Test data
const testImage: UploadImageInput = {
  filename: 'test-image.jpg',
  original_filename: 'original-test.jpg',
  file_path: '/uploads/test-image.jpg',
  file_size: 1024000,
  mime_type: 'image/jpeg',
  width: 1920,
  height: 1080
};

const createTestImage = async () => {
  const result = await db.insert(imagesTable)
    .values(testImage)
    .returning()
    .execute();
  return result[0];
};

const createTestOperation = async (
  imageId: number,
  operationType: AIOperationType = 'object_removal',
  status: AIOperationStatus = 'completed',
  processingTime?: number
) => {
  const operationData = {
    image_id: imageId,
    operation_type: operationType,
    status,
    prompt: operationType === 'object_removal' ? null : 'Test prompt',
    mask_data: operationType === 'object_removal' ? '{"coordinates": [10, 20, 30, 40]}' : null,
    parameters: '{"test": "param"}',
    result_image_path: status === 'completed' ? '/results/test-result.jpg' : null,
    error_message: status === 'failed' ? 'Test error' : null,
    processing_time: processingTime || null
  };

  const result = await db.insert(aiOperationsTable)
    .values(operationData)
    .returning()
    .execute();
  return result[0];
};

describe('listOperations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all operations when no imageId is provided', async () => {
    // Create test images and operations
    const image1 = await createTestImage();
    const image2 = await createTestImage();
    
    await createTestOperation(image1.id, 'object_removal', 'completed');
    await createTestOperation(image2.id, 'style_transfer', 'pending');
    await createTestOperation(image1.id, 'image_modification', 'failed');

    const result = await listOperations();

    expect(result).toHaveLength(3);
    
    // Verify all operations are included
    const operationTypes = result.map(op => op.operation_type);
    expect(operationTypes).toContain('object_removal');
    expect(operationTypes).toContain('style_transfer');
    expect(operationTypes).toContain('image_modification');
  });

  it('should filter operations by image_id when provided', async () => {
    // Create test images and operations
    const image1 = await createTestImage();
    const image2 = await createTestImage();
    
    await createTestOperation(image1.id, 'object_removal', 'completed');
    await createTestOperation(image2.id, 'style_transfer', 'pending');
    await createTestOperation(image1.id, 'image_modification', 'failed');

    const result = await listOperations(image1.id);

    expect(result).toHaveLength(2);
    
    // Verify only operations for image1 are returned
    result.forEach(operation => {
      expect(operation.image_id).toEqual(image1.id);
    });

    const operationTypes = result.map(op => op.operation_type);
    expect(operationTypes).toContain('object_removal');
    expect(operationTypes).toContain('image_modification');
    expect(operationTypes).not.toContain('style_transfer');
  });

  it('should order operations by creation date (most recent first)', async () => {
    const image = await createTestImage();
    
    // Create operations with some delay between them
    const op1 = await createTestOperation(image.id, 'object_removal', 'completed');
    
    // Add small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const op2 = await createTestOperation(image.id, 'style_transfer', 'pending');
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const op3 = await createTestOperation(image.id, 'image_modification', 'failed');

    const result = await listOperations(image.id);

    expect(result).toHaveLength(3);
    
    // Verify ordering (most recent first)
    expect(result[0].id).toEqual(op3.id); // Most recent
    expect(result[1].id).toEqual(op2.id); // Middle
    expect(result[2].id).toEqual(op1.id); // Oldest
    
    // Verify dates are in descending order
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at.getTime()).toBeGreaterThanOrEqual(
        result[i + 1].created_at.getTime()
      );
    }
  });

  it('should include all operation details including status and results', async () => {
    const image = await createTestImage();
    const processingTime = 2.5;
    
    const operation = await createTestOperation(image.id, 'style_transfer', 'completed', processingTime);

    const result = await listOperations(image.id);

    expect(result).toHaveLength(1);
    
    const op = result[0];
    expect(op.id).toEqual(operation.id);
    expect(op.image_id).toEqual(image.id);
    expect(op.operation_type).toEqual('style_transfer');
    expect(op.status).toEqual('completed');
    expect(op.prompt).toEqual('Test prompt');
    expect(op.mask_data).toBeNull();
    expect(op.parameters).toEqual('{"test": "param"}');
    expect(op.result_image_path).toEqual('/results/test-result.jpg');
    expect(op.error_message).toBeNull();
    expect(op.processing_time).toEqual(2.5);
    expect(typeof op.processing_time).toBe('number');
    expect(op.created_at).toBeInstanceOf(Date);
    expect(op.updated_at).toBeInstanceOf(Date);
  });

  it('should handle operations with different statuses correctly', async () => {
    const image = await createTestImage();
    
    await createTestOperation(image.id, 'object_removal', 'pending');
    await createTestOperation(image.id, 'style_transfer', 'processing');
    await createTestOperation(image.id, 'image_modification', 'completed', 1.8);
    await createTestOperation(image.id, 'object_removal', 'failed');

    const result = await listOperations(image.id);

    expect(result).toHaveLength(4);
    
    const statuses = result.map(op => op.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('processing');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');

    // Verify completed operation has result path and processing time
    const completedOp = result.find(op => op.status === 'completed');
    expect(completedOp?.result_image_path).toEqual('/results/test-result.jpg');
    expect(completedOp?.processing_time).toEqual(1.8);
    expect(completedOp?.error_message).toBeNull();

    // Verify failed operation has error message
    const failedOp = result.find(op => op.status === 'failed');
    expect(failedOp?.error_message).toEqual('Test error');
    expect(failedOp?.result_image_path).toBeNull();
  });

  it('should return empty array when no operations exist', async () => {
    const result = await listOperations();
    expect(result).toHaveLength(0);
  });

  it('should return empty array when filtering by non-existent image_id', async () => {
    const image = await createTestImage();
    await createTestOperation(image.id, 'object_removal', 'completed');

    const result = await listOperations(99999); // Non-existent image ID

    expect(result).toHaveLength(0);
  });

  it('should convert numeric processing_time correctly', async () => {
    const image = await createTestImage();
    
    // Test with different numeric values
    await createTestOperation(image.id, 'object_removal', 'completed', 1.23);
    await createTestOperation(image.id, 'style_transfer', 'completed', 45.67);
    await createTestOperation(image.id, 'image_modification', 'completed', 0.1);

    const result = await listOperations(image.id);

    expect(result).toHaveLength(3);
    
    result.forEach(operation => {
      expect(operation.processing_time).not.toBeNull();
      expect(typeof operation.processing_time).toBe('number');
      expect(operation.processing_time).toBeGreaterThan(0);
    });

    // Verify specific values
    const times = result.map(op => op.processing_time).sort();
    expect(times).toContain(0.1);
    expect(times).toContain(1.23);
    expect(times).toContain(45.67);
  });
});