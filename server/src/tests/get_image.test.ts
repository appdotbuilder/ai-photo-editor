import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { imagesTable } from '../db/schema';
import { type UploadImageInput } from '../schema';
import { getImage } from '../handlers/get_image';
import { eq } from 'drizzle-orm';

// Test image data
const testImageInput: UploadImageInput = {
  filename: 'test-image.jpg',
  original_filename: 'original-test-image.jpg',
  file_path: '/uploads/test-image.jpg',
  file_size: 1024000,
  mime_type: 'image/jpeg',
  width: 1920,
  height: 1080
};

const secondTestImageInput: UploadImageInput = {
  filename: 'test-image-2.png',
  original_filename: 'original-test-image-2.png',
  file_path: '/uploads/test-image-2.png',
  file_size: 512000,
  mime_type: 'image/png',
  width: 800,
  height: 600
};

describe('getImage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve an existing image by ID', async () => {
    // Create a test image first
    const insertResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();

    const createdImage = insertResult[0];

    // Retrieve the image using the handler
    const result = await getImage(createdImage.id);

    // Verify the image was retrieved correctly
    expect(result).toBeDefined();
    expect(result!.id).toEqual(createdImage.id);
    expect(result!.filename).toEqual('test-image.jpg');
    expect(result!.original_filename).toEqual('original-test-image.jpg');
    expect(result!.file_path).toEqual('/uploads/test-image.jpg');
    expect(result!.file_size).toEqual(1024000);
    expect(result!.mime_type).toEqual('image/jpeg');
    expect(result!.width).toEqual(1920);
    expect(result!.height).toEqual(1080);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent image ID', async () => {
    // Try to retrieve an image that doesn't exist
    const result = await getImage(999999);

    expect(result).toBeNull();
  });

  it('should return null for negative image ID', async () => {
    // Try to retrieve an image with negative ID
    const result = await getImage(-1);

    expect(result).toBeNull();
  });

  it('should return null for zero image ID', async () => {
    // Try to retrieve an image with ID zero
    const result = await getImage(0);

    expect(result).toBeNull();
  });

  it('should retrieve correct image when multiple images exist', async () => {
    // Create multiple test images
    const firstImage = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();

    const secondImage = await db.insert(imagesTable)
      .values(secondTestImageInput)
      .returning()
      .execute();

    // Retrieve the second image specifically
    const result = await getImage(secondImage[0].id);

    // Verify we got the correct image
    expect(result).toBeDefined();
    expect(result!.id).toEqual(secondImage[0].id);
    expect(result!.filename).toEqual('test-image-2.png');
    expect(result!.mime_type).toEqual('image/png');
    expect(result!.width).toEqual(800);
    expect(result!.height).toEqual(600);

    // Verify it's not the first image
    expect(result!.id).not.toEqual(firstImage[0].id);
    expect(result!.filename).not.toEqual('test-image.jpg');
  });

  it('should retrieve image with all expected fields', async () => {
    // Create a test image
    const insertResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();

    const createdImage = insertResult[0];

    // Retrieve the image
    const result = await getImage(createdImage.id);

    // Verify all required fields are present
    expect(result).toBeDefined();
    expect(typeof result!.id).toBe('number');
    expect(typeof result!.filename).toBe('string');
    expect(typeof result!.original_filename).toBe('string');
    expect(typeof result!.file_path).toBe('string');
    expect(typeof result!.file_size).toBe('number');
    expect(typeof result!.mime_type).toBe('string');
    expect(typeof result!.width).toBe('number');
    expect(typeof result!.height).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should verify image exists in database after retrieval', async () => {
    // Create a test image
    const insertResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();

    const createdImage = insertResult[0];

    // Retrieve using handler
    const handlerResult = await getImage(createdImage.id);

    // Verify by direct database query
    const dbResult = await db.select()
      .from(imagesTable)
      .where(eq(imagesTable.id, createdImage.id))
      .execute();

    expect(handlerResult).toBeDefined();
    expect(dbResult).toHaveLength(1);
    expect(handlerResult!.id).toEqual(dbResult[0].id);
    expect(handlerResult!.filename).toEqual(dbResult[0].filename);
    expect(handlerResult!.file_path).toEqual(dbResult[0].file_path);
  });
});