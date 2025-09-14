import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  uploadImageInputSchema,
  objectRemovalInputSchema,
  styleTransferInputSchema,
  imageModificationInputSchema,
  createProjectInputSchema,
  updateProjectInputSchema,
  getOperationResultSchema,
  listProjectsInputSchema
} from './schema';

// Import handlers
import { uploadImage } from './handlers/upload_image';
import { getImage } from './handlers/get_image';
import { removeObject } from './handlers/remove_object';
import { applyStyleTransfer } from './handlers/apply_style_transfer';
import { modifyImage } from './handlers/modify_image';
import { getOperationResult } from './handlers/get_operation_result';
import { createProject } from './handlers/create_project';
import { getProject } from './handlers/get_project';
import { listProjects } from './handlers/list_projects';
import { updateProject } from './handlers/update_project';
import { listOperations } from './handlers/list_operations';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Image management endpoints
  uploadImage: publicProcedure
    .input(uploadImageInputSchema)
    .mutation(({ input }) => uploadImage(input)),

  getImage: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getImage(input.id)),

  // AI-powered editing endpoints
  removeObject: publicProcedure
    .input(objectRemovalInputSchema)
    .mutation(({ input }) => removeObject(input)),

  applyStyleTransfer: publicProcedure
    .input(styleTransferInputSchema)
    .mutation(({ input }) => applyStyleTransfer(input)),

  modifyImage: publicProcedure
    .input(imageModificationInputSchema)
    .mutation(({ input }) => modifyImage(input)),

  // Operation result tracking
  getOperationResult: publicProcedure
    .input(getOperationResultSchema)
    .query(({ input }) => getOperationResult(input.operation_id)),

  listOperations: publicProcedure
    .input(z.object({ image_id: z.number().optional() }))
    .query(({ input }) => listOperations(input.image_id)),

  // Project management endpoints
  createProject: publicProcedure
    .input(createProjectInputSchema)
    .mutation(({ input }) => createProject(input)),

  getProject: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getProject(input.id)),

  listProjects: publicProcedure
    .input(listProjectsInputSchema)
    .query(({ input }) => listProjects(input)),

  updateProject: publicProcedure
    .input(updateProjectInputSchema)
    .mutation(({ input }) => updateProject(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`🚀 AI Photo Editor TRPC server listening at port: ${port}`);
  console.log(`🎨 Available endpoints:`);
  console.log(`   - Image Upload & Management`);
  console.log(`   - AI Object Removal`);
  console.log(`   - AI Style Transfer`);
  console.log(`   - AI Image Modifications`);
  console.log(`   - Project Management`);
}

start();