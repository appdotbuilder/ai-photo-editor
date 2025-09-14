import { z } from 'zod';

// Image upload schema
export const imageSchema = z.object({
  id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Image = z.infer<typeof imageSchema>;

// Image upload input schema
export const uploadImageInputSchema = z.object({
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string(),
  file_size: z.number().positive(),
  mime_type: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive()
});

export type UploadImageInput = z.infer<typeof uploadImageInputSchema>;

// AI operation types
export const aiOperationTypeSchema = z.enum([
  'object_removal',
  'style_transfer',
  'image_modification'
]);

export type AIOperationType = z.infer<typeof aiOperationTypeSchema>;

// AI operation status
export const aiOperationStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed'
]);

export type AIOperationStatus = z.infer<typeof aiOperationStatusSchema>;

// AI operation schema
export const aiOperationSchema = z.object({
  id: z.number(),
  image_id: z.number(),
  operation_type: aiOperationTypeSchema,
  status: aiOperationStatusSchema,
  prompt: z.string().nullable(),
  mask_data: z.string().nullable(), // JSON string containing mask coordinates/path
  parameters: z.string().nullable(), // JSON string for additional parameters
  result_image_path: z.string().nullable(),
  error_message: z.string().nullable(),
  processing_time: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type AIOperation = z.infer<typeof aiOperationSchema>;

// Object removal input schema
export const objectRemovalInputSchema = z.object({
  image_id: z.number(),
  mask_data: z.string(), // JSON string containing selection mask/coordinates
  parameters: z.object({
    inpaint_strength: z.number().min(0).max(1).optional().default(0.8),
    guidance_scale: z.number().min(1).max(20).optional().default(7.5)
  }).optional()
});

export type ObjectRemovalInput = z.infer<typeof objectRemovalInputSchema>;

// Style transfer input schema
export const styleTransferInputSchema = z.object({
  image_id: z.number(),
  prompt: z.string(),
  parameters: z.object({
    style_strength: z.number().min(0).max(1).optional().default(0.7),
    guidance_scale: z.number().min(1).max(20).optional().default(7.5),
    num_inference_steps: z.number().int().min(10).max(100).optional().default(50)
  }).optional()
});

export type StyleTransferInput = z.infer<typeof styleTransferInputSchema>;

// Image modification input schema
export const imageModificationInputSchema = z.object({
  image_id: z.number(),
  prompt: z.string(),
  mask_data: z.string().nullable().optional(), // Optional mask for targeted modifications
  parameters: z.object({
    modification_strength: z.number().min(0).max(1).optional().default(0.8),
    guidance_scale: z.number().min(1).max(20).optional().default(7.5),
    num_inference_steps: z.number().int().min(10).max(100).optional().default(50)
  }).optional()
});

export type ImageModificationInput = z.infer<typeof imageModificationInputSchema>;

// Project schema for saving user work
export const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  original_image_id: z.number(),
  current_image_path: z.string(),
  operations_history: z.string(), // JSON string containing operation history
  is_public: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Project = z.infer<typeof projectSchema>;

// Create project input schema
export const createProjectInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  original_image_id: z.number(),
  is_public: z.boolean().optional().default(false)
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

// Update project input schema
export const updateProjectInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  current_image_path: z.string().optional(),
  operations_history: z.string().optional(),
  is_public: z.boolean().optional()
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

// Get operation result schema
export const getOperationResultSchema = z.object({
  operation_id: z.number()
});

export type GetOperationResultInput = z.infer<typeof getOperationResultSchema>;

// List projects query schema
export const listProjectsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  public_only: z.boolean().optional().default(false)
});

export type ListProjectsInput = z.infer<typeof listProjectsInputSchema>;