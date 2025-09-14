import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable, imagesTable } from '../db/schema';
import { type ListProjectsInput } from '../schema';
import { listProjects } from '../handlers/list_projects';

// Test data setup helper
async function createTestImage(filename = 'test-image.jpg') {
  const result = await db.insert(imagesTable)
    .values({
      filename,
      original_filename: filename,
      file_path: `/uploads/${filename}`,
      file_size: 1024,
      mime_type: 'image/jpeg',
      width: 800,
      height: 600
    })
    .returning()
    .execute();
  
  return result[0];
}

async function createTestProject(imageId: number, options: { name?: string, isPublic?: boolean, description?: string } = {}) {
  const result = await db.insert(projectsTable)
    .values({
      name: options.name || 'Test Project',
      description: options.description || null,
      original_image_id: imageId,
      current_image_path: `/results/modified-${imageId}.jpg`,
      operations_history: JSON.stringify([]),
      is_public: options.isPublic || false
    })
    .returning()
    .execute();
  
  return result[0];
}

describe('listProjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should list all projects with default pagination', async () => {
    // Create test data
    const image = await createTestImage();
    await createTestProject(image.id, { name: 'Public Project', isPublic: true });
    await createTestProject(image.id, { name: 'Private Project', isPublic: false });

    const input: ListProjectsInput = {
      limit: 20,
      offset: 0,
      public_only: false
    };

    const result = await listProjects(input);

    expect(result.projects).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.projects[0].name).toBeDefined();
    expect(result.projects[0].original_image_id).toBe(image.id);
    expect(result.projects[0].created_at).toBeInstanceOf(Date);
    expect(result.projects[0].updated_at).toBeInstanceOf(Date);
  });

  it('should filter public projects only', async () => {
    // Create test data
    const image = await createTestImage();
    await createTestProject(image.id, { name: 'Public Project 1', isPublic: true });
    await createTestProject(image.id, { name: 'Public Project 2', isPublic: true });
    await createTestProject(image.id, { name: 'Private Project', isPublic: false });

    const input: ListProjectsInput = {
      limit: 20,
      offset: 0,
      public_only: true
    };

    const result = await listProjects(input);

    expect(result.projects).toHaveLength(2);
    expect(result.total).toBe(2);
    result.projects.forEach(project => {
      expect(project.is_public).toBe(true);
    });
  });

  it('should apply pagination correctly', async () => {
    // Create test data
    const image = await createTestImage();
    for (let i = 1; i <= 5; i++) {
      await createTestProject(image.id, { name: `Project ${i}`, isPublic: true });
    }

    // Test first page
    const firstPageInput: ListProjectsInput = {
      limit: 2,
      offset: 0,
      public_only: false
    };

    const firstPage = await listProjects(firstPageInput);
    expect(firstPage.projects).toHaveLength(2);
    expect(firstPage.total).toBe(5);

    // Test second page
    const secondPageInput: ListProjectsInput = {
      limit: 2,
      offset: 2,
      public_only: false
    };

    const secondPage = await listProjects(secondPageInput);
    expect(secondPage.projects).toHaveLength(2);
    expect(secondPage.total).toBe(5);

    // Test last page
    const lastPageInput: ListProjectsInput = {
      limit: 2,
      offset: 4,
      public_only: false
    };

    const lastPage = await listProjects(lastPageInput);
    expect(lastPage.projects).toHaveLength(1);
    expect(lastPage.total).toBe(5);
  });

  it('should return empty result when no projects exist', async () => {
    const input: ListProjectsInput = {
      limit: 20,
      offset: 0,
      public_only: false
    };

    const result = await listProjects(input);

    expect(result.projects).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should handle pagination beyond available data', async () => {
    // Create test data
    const image = await createTestImage();
    await createTestProject(image.id, { name: 'Only Project', isPublic: true });

    const input: ListProjectsInput = {
      limit: 10,
      offset: 100, // Offset beyond available data
      public_only: false
    };

    const result = await listProjects(input);

    expect(result.projects).toHaveLength(0);
    expect(result.total).toBe(1); // Total should still reflect actual count
  });

  it('should include all project fields', async () => {
    // Create test data
    const image = await createTestImage();
    const project = await createTestProject(image.id, {
      name: 'Full Project',
      isPublic: true,
      description: 'A project with description'
    });

    const input: ListProjectsInput = {
      limit: 20,
      offset: 0,
      public_only: false
    };

    const result = await listProjects(input);

    expect(result.projects).toHaveLength(1);
    const returnedProject = result.projects[0];

    // Verify all required fields are present
    expect(returnedProject.id).toBe(project.id);
    expect(returnedProject.name).toBe('Full Project');
    expect(returnedProject.description).toBe('A project with description');
    expect(returnedProject.original_image_id).toBe(image.id);
    expect(returnedProject.current_image_path).toBeDefined();
    expect(returnedProject.operations_history).toBeDefined();
    expect(returnedProject.is_public).toBe(true);
    expect(returnedProject.created_at).toBeInstanceOf(Date);
    expect(returnedProject.updated_at).toBeInstanceOf(Date);
  });

  it('should combine public filter with pagination', async () => {
    // Create mixed public/private projects
    const image = await createTestImage();
    for (let i = 1; i <= 3; i++) {
      await createTestProject(image.id, { name: `Public Project ${i}`, isPublic: true });
      await createTestProject(image.id, { name: `Private Project ${i}`, isPublic: false });
    }

    const input: ListProjectsInput = {
      limit: 2,
      offset: 1,
      public_only: true
    };

    const result = await listProjects(input);

    expect(result.projects).toHaveLength(2);
    expect(result.total).toBe(3); // Only public projects counted
    result.projects.forEach(project => {
      expect(project.is_public).toBe(true);
      expect(project.name).toContain('Public');
    });
  });
});