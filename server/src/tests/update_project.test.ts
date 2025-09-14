import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { imagesTable, projectsTable } from '../db/schema';
import { type UpdateProjectInput } from '../schema';
import { updateProject } from '../handlers/update_project';
import { eq } from 'drizzle-orm';

describe('updateProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testImageId: number;
  let testProjectId: number;

  beforeEach(async () => {
    // Create test image first
    const imageResult = await db.insert(imagesTable)
      .values({
        filename: 'test-image.jpg',
        original_filename: 'original-test.jpg',
        file_path: '/uploads/test-image.jpg',
        file_size: 1024,
        mime_type: 'image/jpeg',
        width: 800,
        height: 600
      })
      .returning()
      .execute();

    testImageId = imageResult[0].id;

    // Create test project
    const projectResult = await db.insert(projectsTable)
      .values({
        name: 'Test Project',
        description: 'A test project',
        original_image_id: testImageId,
        current_image_path: '/uploads/test-image.jpg',
        operations_history: JSON.stringify([]),
        is_public: false
      })
      .returning()
      .execute();

    testProjectId = projectResult[0].id;
  });

  it('should update project name', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      name: 'Updated Project Name'
    };

    const result = await updateProject(input);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Updated Project Name');
    expect(result!.id).toEqual(testProjectId);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const dbProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, testProjectId))
      .execute();

    expect(dbProject[0].name).toEqual('Updated Project Name');
  });

  it('should update project description', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      description: 'Updated description for the project'
    };

    const result = await updateProject(input);

    expect(result).not.toBeNull();
    expect(result!.description).toEqual('Updated description for the project');
    expect(result!.name).toEqual('Test Project'); // Should remain unchanged
  });

  it('should update project description to null', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      description: null
    };

    const result = await updateProject(input);

    expect(result).not.toBeNull();
    expect(result!.description).toBeNull();
  });

  it('should update current image path', async () => {
    const newImagePath = '/uploads/modified-image.jpg';
    const input: UpdateProjectInput = {
      id: testProjectId,
      current_image_path: newImagePath
    };

    const result = await updateProject(input);

    expect(result).not.toBeNull();
    expect(result!.current_image_path).toEqual(newImagePath);
  });

  it('should update operations history', async () => {
    const operationsHistory = JSON.stringify([
      { operation: 'object_removal', timestamp: '2024-01-01T00:00:00Z' },
      { operation: 'style_transfer', timestamp: '2024-01-01T01:00:00Z' }
    ]);

    const input: UpdateProjectInput = {
      id: testProjectId,
      operations_history: operationsHistory
    };

    const result = await updateProject(input);

    expect(result).not.toBeNull();
    expect(result!.operations_history).toEqual(operationsHistory);
  });

  it('should update public visibility', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      is_public: true
    };

    const result = await updateProject(input);

    expect(result).not.toBeNull();
    expect(result!.is_public).toEqual(true);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateProjectInput = {
      id: testProjectId,
      name: 'Multi-field Update',
      description: 'Updated description',
      current_image_path: '/uploads/new-result.jpg',
      is_public: true
    };

    const result = await updateProject(input);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Multi-field Update');
    expect(result!.description).toEqual('Updated description');
    expect(result!.current_image_path).toEqual('/uploads/new-result.jpg');
    expect(result!.is_public).toEqual(true);

    // Verify all changes in database
    const dbProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, testProjectId))
      .execute();

    expect(dbProject[0].name).toEqual('Multi-field Update');
    expect(dbProject[0].description).toEqual('Updated description');
    expect(dbProject[0].current_image_path).toEqual('/uploads/new-result.jpg');
    expect(dbProject[0].is_public).toEqual(true);
  });

  it('should return null for non-existent project', async () => {
    const input: UpdateProjectInput = {
      id: 99999,
      name: 'Non-existent Project'
    };

    const result = await updateProject(input);

    expect(result).toBeNull();
  });

  it('should update only updated_at when no fields provided', async () => {
    const originalProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, testProjectId))
      .execute();

    const input: UpdateProjectInput = {
      id: testProjectId
    };

    const result = await updateProject(input);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual(originalProject[0].name);
    expect(result!.description).toEqual(originalProject[0].description);
    expect(result!.current_image_path).toEqual(originalProject[0].current_image_path);
    expect(result!.operations_history).toEqual(originalProject[0].operations_history);
    expect(result!.is_public).toEqual(originalProject[0].is_public);
    
    // But updated_at should be different
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalProject[0].updated_at.getTime());
  });

  it('should handle complex operations history update', async () => {
    const complexHistory = JSON.stringify({
      operations: [
        {
          id: 1,
          type: 'object_removal',
          timestamp: '2024-01-01T00:00:00Z',
          parameters: { inpaint_strength: 0.8 },
          result_path: '/results/step1.jpg'
        },
        {
          id: 2,
          type: 'style_transfer',
          timestamp: '2024-01-01T01:00:00Z',
          parameters: { style_strength: 0.7 },
          result_path: '/results/step2.jpg'
        }
      ],
      current_step: 2,
      metadata: {
        total_processing_time: 45.2,
        user_feedback: 'Great results!'
      }
    });

    const input: UpdateProjectInput = {
      id: testProjectId,
      operations_history: complexHistory,
      current_image_path: '/results/step2.jpg'
    };

    const result = await updateProject(input);

    expect(result).not.toBeNull();
    expect(result!.operations_history).toEqual(complexHistory);
    expect(result!.current_image_path).toEqual('/results/step2.jpg');

    // Verify the JSON can be parsed back
    const parsedHistory = JSON.parse(result!.operations_history);
    expect(parsedHistory.operations).toHaveLength(2);
    expect(parsedHistory.current_step).toEqual(2);
    expect(parsedHistory.metadata.total_processing_time).toEqual(45.2);
  });
});