import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { imagesTable } from '../db/schema';
import { type UploadImageInput } from '../schema';
import { uploadImage } from '../handlers/upload_image';
import { eq } from 'drizzle-orm';

// Test input for a typical image upload
const testInput: UploadImageInput = {
  filename: 'test-image-123.jpg',
  original_filename: 'my-photo.jpg',
  file_path: '/uploads/images/test-image-123.jpg',
  file_size: 1048576, // 1MB in bytes
  mime_type: 'image/jpeg',
  width: 1920,
  height: 1080
};

// Test input for a PNG image
const pngTestInput: UploadImageInput = {
  filename: 'test-image-456.png',
  original_filename: 'screenshot.png',
  file_path: '/uploads/images/test-image-456.png',
  file_size: 2097152, // 2MB in bytes
  mime_type: 'image/png',
  width: 2560,
  height: 1440
};

// Test input for a small WebP image
const webpTestInput: UploadImageInput = {
  filename: 'small-image.webp',
  original_filename: 'profile.webp',
  file_path: '/uploads/images/small-image.webp',
  file_size: 51200, // 50KB in bytes
  mime_type: 'image/webp',
  width: 300,
  height: 300
};

describe('uploadImage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should upload a JPEG image successfully', async () => {
    const result = await uploadImage(testInput);

    // Validate basic fields
    expect(result.filename).toEqual('test-image-123.jpg');
    expect(result.original_filename).toEqual('my-photo.jpg');
    expect(result.file_path).toEqual('/uploads/images/test-image-123.jpg');
    expect(result.file_size).toEqual(1048576);
    expect(result.mime_type).toEqual('image/jpeg');
    expect(result.width).toEqual(1920);
    expect(result.height).toEqual(1080);
    
    // Validate generated fields
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should upload a PNG image successfully', async () => {
    const result = await uploadImage(pngTestInput);

    expect(result.filename).toEqual('test-image-456.png');
    expect(result.mime_type).toEqual('image/png');
    expect(result.width).toEqual(2560);
    expect(result.height).toEqual(1440);
    expect(result.file_size).toEqual(2097152);
    expect(result.id).toBeDefined();
  });

  it('should upload a WebP image successfully', async () => {
    const result = await uploadImage(webpTestInput);

    expect(result.filename).toEqual('small-image.webp');
    expect(result.mime_type).toEqual('image/webp');
    expect(result.width).toEqual(300);
    expect(result.height).toEqual(300);
    expect(result.file_size).toEqual(51200);
    expect(result.id).toBeDefined();
  });

  it('should save image data to database', async () => {
    const result = await uploadImage(testInput);

    // Query the database to verify the record was created
    const images = await db.select()
      .from(imagesTable)
      .where(eq(imagesTable.id, result.id))
      .execute();

    expect(images).toHaveLength(1);
    const savedImage = images[0];
    
    expect(savedImage.filename).toEqual('test-image-123.jpg');
    expect(savedImage.original_filename).toEqual('my-photo.jpg');
    expect(savedImage.file_path).toEqual('/uploads/images/test-image-123.jpg');
    expect(savedImage.file_size).toEqual(1048576);
    expect(savedImage.mime_type).toEqual('image/jpeg');
    expect(savedImage.width).toEqual(1920);
    expect(savedImage.height).toEqual(1080);
    expect(savedImage.created_at).toBeInstanceOf(Date);
    expect(savedImage.updated_at).toBeInstanceOf(Date);
  });

  it('should generate unique IDs for multiple uploads', async () => {
    const result1 = await uploadImage(testInput);
    const result2 = await uploadImage(pngTestInput);
    const result3 = await uploadImage(webpTestInput);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.id).not.toEqual(result3.id);
    expect(result2.id).not.toEqual(result3.id);

    // Verify all records exist in database
    const images = await db.select()
      .from(imagesTable)
      .execute();

    expect(images).toHaveLength(3);
    
    const ids = images.map(img => img.id);
    expect(ids).toContain(result1.id);
    expect(ids).toContain(result2.id);
    expect(ids).toContain(result3.id);
  });

  it('should handle large file sizes correctly', async () => {
    const largeFileInput: UploadImageInput = {
      filename: 'large-image.jpg',
      original_filename: 'high-res-photo.jpg',
      file_path: '/uploads/images/large-image.jpg',
      file_size: 10485760, // 10MB
      mime_type: 'image/jpeg',
      width: 4096,
      height: 2160
    };

    const result = await uploadImage(largeFileInput);

    expect(result.file_size).toEqual(10485760);
    expect(result.width).toEqual(4096);
    expect(result.height).toEqual(2160);
    expect(result.id).toBeDefined();
  });

  it('should preserve timestamp consistency', async () => {
    const beforeUpload = new Date();
    const result = await uploadImage(testInput);
    const afterUpload = new Date();

    // Created and updated timestamps should be close to upload time
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeUpload.getTime() - 1000);
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterUpload.getTime() + 1000);
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeUpload.getTime() - 1000);
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterUpload.getTime() + 1000);

    // Initially, created_at and updated_at should be very close
    expect(Math.abs(result.created_at.getTime() - result.updated_at.getTime())).toBeLessThan(100);
  });
});