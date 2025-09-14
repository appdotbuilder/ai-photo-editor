import { db } from '../db';
import { aiOperationsTable } from '../db/schema';
import { type AIOperation } from '../schema';
import { eq } from 'drizzle-orm';

export const getOperationResult = async (operationId: number): Promise<AIOperation | null> => {
  try {
    // Query the database for the AI operation with the given ID
    const results = await db.select()
      .from(aiOperationsTable)
      .where(eq(aiOperationsTable.id, operationId))
      .execute();

    // Return null if operation not found
    if (results.length === 0) {
      return null;
    }

    const operation = results[0];
    
    // Convert numeric fields back to numbers before returning
    return {
      ...operation,
      processing_time: operation.processing_time ? parseFloat(operation.processing_time.toString()) : null
    };
  } catch (error) {
    console.error('Get operation result failed:', error);
    throw error;
  }
};