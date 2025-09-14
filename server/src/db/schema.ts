import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  integer, 
  boolean, 
  pgEnum,
  real,
  varchar
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for AI operations
export const aiOperationTypeEnum = pgEnum('ai_operation_type', [
  'object_removal',
  'style_transfer', 
  'image_modification'
]);

export const aiOperationStatusEnum = pgEnum('ai_operation_status', [
  'pending',
  'processing',
  'completed',
  'failed'
]);

// Images table
export const imagesTable = pgTable('images', {
  id: serial('id').primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  original_filename: varchar('original_filename', { length: 255 }).notNull(),
  file_path: text('file_path').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: varchar('mime_type', { length: 100 }).notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// AI operations table
export const aiOperationsTable = pgTable('ai_operations', {
  id: serial('id').primaryKey(),
  image_id: integer('image_id').notNull().references(() => imagesTable.id, { onDelete: 'cascade' }),
  operation_type: aiOperationTypeEnum('operation_type').notNull(),
  status: aiOperationStatusEnum('status').default('pending').notNull(),
  prompt: text('prompt'), // Nullable for operations that don't need prompts
  mask_data: text('mask_data'), // JSON string containing mask coordinates/path
  parameters: text('parameters'), // JSON string for additional parameters
  result_image_path: text('result_image_path'), // Path to generated result image
  error_message: text('error_message'), // Error details if operation fails
  processing_time: real('processing_time'), // Time taken for processing in seconds
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Projects table for saving user work
export const projectsTable = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'), // Nullable
  original_image_id: integer('original_image_id').notNull().references(() => imagesTable.id, { onDelete: 'cascade' }),
  current_image_path: text('current_image_path').notNull(),
  operations_history: text('operations_history').notNull(), // JSON string containing operation history
  is_public: boolean('is_public').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Define relations
export const imagesRelations = relations(imagesTable, ({ many }) => ({
  ai_operations: many(aiOperationsTable),
  projects: many(projectsTable)
}));

export const aiOperationsRelations = relations(aiOperationsTable, ({ one }) => ({
  image: one(imagesTable, {
    fields: [aiOperationsTable.image_id],
    references: [imagesTable.id]
  })
}));

export const projectsRelations = relations(projectsTable, ({ one }) => ({
  original_image: one(imagesTable, {
    fields: [projectsTable.original_image_id],
    references: [imagesTable.id]
  })
}));

// TypeScript types for the table schemas
export type Image = typeof imagesTable.$inferSelect;
export type NewImage = typeof imagesTable.$inferInsert;

export type AIOperation = typeof aiOperationsTable.$inferSelect;
export type NewAIOperation = typeof aiOperationsTable.$inferInsert;

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  images: imagesTable, 
  aiOperations: aiOperationsTable,
  projects: projectsTable
};

export const tableRelations = {
  imagesRelations,
  aiOperationsRelations,
  projectsRelations
};