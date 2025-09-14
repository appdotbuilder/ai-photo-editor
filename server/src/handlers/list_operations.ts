import { db } from '../db';
import { aiOperationsTable } from '../db/schema';
import { type AIOperation } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function listOperations(imageId?: number): Promise<AIOperation[]> {
  try {
    // Build query step by step
    const baseQuery = db.select().from(aiOperationsTable);
    
    let query;
    if (imageId !== undefined) {
      query = baseQuery.where(eq(aiOperationsTable.image_id, imageId));
    } else {
      query = baseQuery;
    }

    // Apply ordering and execute
    const results = await query
      .orderBy(desc(aiOperationsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers for processing_time
    return results.map(operation => ({
      ...operation,
      processing_time: operation.processing_time !== null ? parseFloat(String(operation.processing_time)) : null
    }));
  } catch (error) {
    console.error('List operations failed:', error);
    throw error;
  }
}