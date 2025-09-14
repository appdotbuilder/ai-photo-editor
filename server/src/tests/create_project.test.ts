import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable, imagesTable } from '../db/schema';
import { type CreateProjectInput } from '../schema';
import { createProject } from '../handlers/create_project';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testImageInput = {
  filename: 'test-image.jpg',
  original_filename: 'original-test-image.jpg',
  file_path: '/uploads/test-image.jpg',
  file_size: 1024,
  mime_type: 'image/jpeg',
  width: 800,
  height: 600
};

const testProjectInput: CreateProjectInput = {
  name: 'Test Project',
  description: 'A project for testing',
  original_image_id: 1, // Will be set dynamically in tests
  is_public: false
};

describe('createProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a project with valid image reference', async () => {
    // First create an image to reference
    const imageResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();
    const createdImage = imageResult[0];

    // Create project with valid image reference
    const projectInput = {
      ...testProjectInput,
      original_image_id: createdImage.id
    };

    const result = await createProject(projectInput);

    // Verify project fields
    expect(result.name).toEqual('Test Project');
    expect(result.description).toEqual('A project for testing');
    expect(result.original_image_id).toEqual(createdImage.id);
    expect(result.current_image_path).toEqual(createdImage.file_path);
    expect(result.operations_history).toEqual('[]'); // Empty operations history
    expect(result.is_public).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save project to database', async () => {
    // Create image first
    const imageResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();
    const createdImage = imageResult[0];

    const projectInput = {
      ...testProjectInput,
      original_image_id: createdImage.id
    };

    const result = await createProject(projectInput);

    // Verify project exists in database
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, result.id))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toEqual('Test Project');
    expect(projects[0].description).toEqual('A project for testing');
    expect(projects[0].original_image_id).toEqual(createdImage.id);
    expect(projects[0].current_image_path).toEqual(createdImage.file_path);
    expect(projects[0].operations_history).toEqual('[]');
    expect(projects[0].is_public).toEqual(false);
    expect(projects[0].created_at).toBeInstanceOf(Date);
    expect(projects[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create project with minimal input (using defaults)', async () => {
    // Create image first
    const imageResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();
    const createdImage = imageResult[0];

    // Minimal input without optional fields
    const minimalInput: CreateProjectInput = {
      name: 'Minimal Project',
      original_image_id: createdImage.id,
      is_public: false // Since Zod defaults are applied, this field is required in the parsed type
    };

    const result = await createProject(minimalInput);

    expect(result.name).toEqual('Minimal Project');
    expect(result.description).toBeNull(); // Should be null when not provided
    expect(result.original_image_id).toEqual(createdImage.id);
    expect(result.current_image_path).toEqual(createdImage.file_path);
    expect(result.operations_history).toEqual('[]');
    expect(result.is_public).toEqual(false); // Default value
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create public project when is_public is true', async () => {
    // Create image first
    const imageResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();
    const createdImage = imageResult[0];

    const publicProjectInput: CreateProjectInput = {
      name: 'Public Project',
      description: 'A public project',
      original_image_id: createdImage.id,
      is_public: true
    };

    const result = await createProject(publicProjectInput);

    expect(result.name).toEqual('Public Project');
    expect(result.description).toEqual('A public project');
    expect(result.is_public).toEqual(true);
    expect(result.original_image_id).toEqual(createdImage.id);
    expect(result.current_image_path).toEqual(createdImage.file_path);
  });

  it('should throw error when image does not exist', async () => {
    const invalidProjectInput = {
      ...testProjectInput,
      original_image_id: 999 // Non-existent image ID
    };

    await expect(createProject(invalidProjectInput))
      .rejects
      .toThrow(/image with id 999 not found/i);
  });

  it('should initialize current_image_path with original image path', async () => {
    // Create image with specific file path
    const imageWithPath = {
      ...testImageInput,
      file_path: '/uploads/special-path/image.jpg'
    };

    const imageResult = await db.insert(imagesTable)
      .values(imageWithPath)
      .returning()
      .execute();
    const createdImage = imageResult[0];

    const projectInput = {
      ...testProjectInput,
      original_image_id: createdImage.id
    };

    const result = await createProject(projectInput);

    expect(result.current_image_path).toEqual('/uploads/special-path/image.jpg');
  });

  it('should initialize with empty operations history', async () => {
    // Create image first
    const imageResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();
    const createdImage = imageResult[0];

    const projectInput = {
      ...testProjectInput,
      original_image_id: createdImage.id
    };

    const result = await createProject(projectInput);

    expect(result.operations_history).toEqual('[]');
    
    // Verify it's valid JSON that parses to empty array
    const parsedHistory = JSON.parse(result.operations_history);
    expect(Array.isArray(parsedHistory)).toBe(true);
    expect(parsedHistory).toHaveLength(0);
  });
});