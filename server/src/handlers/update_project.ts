import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type UpdateProjectInput, type Project } from '../schema';
import { eq } from 'drizzle-orm';

export const updateProject = async (input: UpdateProjectInput): Promise<Project | null> => {
  try {
    // First check if project exists
    const existingProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, input.id))
      .execute();

    if (existingProject.length === 0) {
      return null;
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.current_image_path !== undefined) {
      updateData.current_image_path = input.current_image_path;
    }

    if (input.operations_history !== undefined) {
      updateData.operations_history = input.operations_history;
    }

    if (input.is_public !== undefined) {
      updateData.is_public = input.is_public;
    }

    // Perform update
    const result = await db.update(projectsTable)
      .set(updateData)
      .where(eq(projectsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Project update failed:', error);
    throw error;
  }
};