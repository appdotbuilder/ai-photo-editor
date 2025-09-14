import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type Project } from '../schema';
import { eq } from 'drizzle-orm';

export async function getProject(projectId: number): Promise<Project | null> {
  try {
    // Query the database for the project with the given ID
    const results = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    // Return the project if found, null otherwise
    if (results.length === 0) {
      return null;
    }

    const project = results[0];
    
    // Return the project record with proper type conversion
    return {
      ...project,
      // Convert date fields if needed
      created_at: project.created_at,
      updated_at: project.updated_at
    };
  } catch (error) {
    console.error('Project retrieval failed:', error);
    throw error;
  }
}