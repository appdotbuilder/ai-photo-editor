import { db } from '../db';
import { projectsTable, imagesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateProjectInput, type Project } from '../schema';

export async function createProject(input: CreateProjectInput): Promise<Project> {
  try {
    // First, validate that the referenced image exists
    const existingImage = await db.select()
      .from(imagesTable)
      .where(eq(imagesTable.id, input.original_image_id))
      .execute();

    if (existingImage.length === 0) {
      throw new Error(`Image with id ${input.original_image_id} not found`);
    }

    const imageRecord = existingImage[0];

    // Create a new project record
    const result = await db.insert(projectsTable)
      .values({
        name: input.name,
        description: input.description || null,
        original_image_id: input.original_image_id,
        current_image_path: imageRecord.file_path, // Initialize with original image path
        operations_history: JSON.stringify([]), // Empty operations history initially
        is_public: input.is_public || false
      })
      .returning()
      .execute();

    const project = result[0];
    return project;
  } catch (error) {
    console.error('Project creation failed:', error);
    throw error;
  }
}