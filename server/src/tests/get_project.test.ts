import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable, imagesTable } from '../db/schema';
import { getProject } from '../handlers/get_project';
import { type UploadImageInput, type CreateProjectInput } from '../schema';
import { eq } from 'drizzle-orm';

// Test data setup
const testImageInput: UploadImageInput = {
  filename: 'test-image.jpg',
  original_filename: 'original-test.jpg',
  file_path: '/uploads/test-image.jpg',
  file_size: 1024000,
  mime_type: 'image/jpeg',
  width: 1920,
  height: 1080
};

const testProjectInput: CreateProjectInput = {
  name: 'Test Project',
  description: 'A project for testing',
  original_image_id: 1, // Will be set after creating image
  is_public: false
};

describe('getProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve a project by ID', async () => {
    // First create an image
    const imageResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();
    
    const imageId = imageResult[0].id;

    // Create a project
    const projectResult = await db.insert(projectsTable)
      .values({
        ...testProjectInput,
        original_image_id: imageId,
        current_image_path: '/uploads/current-image.jpg',
        operations_history: JSON.stringify([])
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Test retrieving the project
    const result = await getProject(projectId);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(projectId);
    expect(result!.name).toEqual('Test Project');
    expect(result!.description).toEqual('A project for testing');
    expect(result!.original_image_id).toEqual(imageId);
    expect(result!.current_image_path).toEqual('/uploads/current-image.jpg');
    expect(result!.operations_history).toEqual('[]');
    expect(result!.is_public).toEqual(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent project', async () => {
    const result = await getProject(999);
    
    expect(result).toBeNull();
  });

  it('should handle project with null description', async () => {
    // First create an image
    const imageResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();
    
    const imageId = imageResult[0].id;

    // Create a project with null description
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Project Without Description',
        description: null,
        original_image_id: imageId,
        current_image_path: '/uploads/no-desc.jpg',
        operations_history: JSON.stringify([{ type: 'test' }]),
        is_public: true
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Test retrieving the project
    const result = await getProject(projectId);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(projectId);
    expect(result!.name).toEqual('Project Without Description');
    expect(result!.description).toBeNull();
    expect(result!.original_image_id).toEqual(imageId);
    expect(result!.current_image_path).toEqual('/uploads/no-desc.jpg');
    expect(result!.operations_history).toEqual('[{"type":"test"}]');
    expect(result!.is_public).toEqual(true);
  });

  it('should retrieve project with complex operations history', async () => {
    // First create an image
    const imageResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();
    
    const imageId = imageResult[0].id;

    // Create complex operations history
    const operationsHistory = [
      { type: 'object_removal', timestamp: '2024-01-01T00:00:00Z', parameters: { strength: 0.8 } },
      { type: 'style_transfer', timestamp: '2024-01-02T00:00:00Z', prompt: 'Van Gogh style' },
      { type: 'image_modification', timestamp: '2024-01-03T00:00:00Z', prompt: 'Add sunset colors' }
    ];

    // Create a project with complex history
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Complex Project',
        description: 'Project with multiple operations',
        original_image_id: imageId,
        current_image_path: '/uploads/complex-result.jpg',
        operations_history: JSON.stringify(operationsHistory),
        is_public: true
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Test retrieving the project
    const result = await getProject(projectId);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(projectId);
    expect(result!.name).toEqual('Complex Project');
    expect(result!.description).toEqual('Project with multiple operations');
    expect(result!.operations_history).toEqual(JSON.stringify(operationsHistory));
    expect(result!.is_public).toEqual(true);
  });

  it('should verify project exists in database after retrieval', async () => {
    // First create an image
    const imageResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();
    
    const imageId = imageResult[0].id;

    // Create a project
    const projectResult = await db.insert(projectsTable)
      .values({
        ...testProjectInput,
        original_image_id: imageId,
        current_image_path: '/uploads/verify-test.jpg',
        operations_history: JSON.stringify([])
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Retrieve project via handler
    const result = await getProject(projectId);

    // Verify it exists in database directly
    const dbResults = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    expect(dbResults).toHaveLength(1);
    expect(result).toBeDefined();
    expect(result!.id).toEqual(dbResults[0].id);
    expect(result!.name).toEqual(dbResults[0].name);
    expect(result!.current_image_path).toEqual(dbResults[0].current_image_path);
  });

  it('should handle retrieval of project with minimal fields', async () => {
    // First create an image
    const imageResult = await db.insert(imagesTable)
      .values(testImageInput)
      .returning()
      .execute();
    
    const imageId = imageResult[0].id;

    // Create a project with minimal data
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Minimal Project',
        description: null,
        original_image_id: imageId,
        current_image_path: '/uploads/minimal.jpg',
        operations_history: JSON.stringify([]),
        is_public: false
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Test retrieving the minimal project
    const result = await getProject(projectId);

    expect(result).toBeDefined();
    expect(result!.name).toEqual('Minimal Project');
    expect(result!.description).toBeNull();
    expect(result!.is_public).toEqual(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});