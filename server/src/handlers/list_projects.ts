import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type ListProjectsInput, type Project } from '../schema';
import { eq, count } from 'drizzle-orm';

export async function listProjects(input: ListProjectsInput): Promise<{ projects: Project[], total: number }> {
  try {
    // Build queries conditionally based on filters
    if (input.public_only) {
      // Query with public filter
      const [projects, totalResult] = await Promise.all([
        db.select()
          .from(projectsTable)
          .where(eq(projectsTable.is_public, true))
          .limit(input.limit)
          .offset(input.offset)
          .execute(),
        db.select({ count: count() })
          .from(projectsTable)
          .where(eq(projectsTable.is_public, true))
          .execute()
      ]);

      const total = totalResult[0]?.count ?? 0;
      return { projects, total };
    } else {
      // Query without filters
      const [projects, totalResult] = await Promise.all([
        db.select()
          .from(projectsTable)
          .limit(input.limit)
          .offset(input.offset)
          .execute(),
        db.select({ count: count() })
          .from(projectsTable)
          .execute()
      ]);

      const total = totalResult[0]?.count ?? 0;
      return { projects, total };
    }
  } catch (error) {
    console.error('List projects failed:', error);
    throw error;
  }
}