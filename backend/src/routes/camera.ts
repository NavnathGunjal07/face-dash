import { Hono } from 'hono';
import type { Context } from 'hono';
import { prisma } from '../lib/prisma';
import { cameraSchema, idSchema, type CameraData } from '../schemas/camera.schema'
import { validateBody } from '../middleware/validation.middleware';

type CustomContext = Context & {
  get(key: 'userId'): string;
  get(key: 'validatedBody'): CameraData;
}

const camera = new Hono();

// Get all cameras for user
camera.get('/', async (c) => {
  const userId = (c.get as any)('userId');
  const cameras = await prisma.camera.findMany({ where: { userId } });
  return c.json(cameras);
});

// Add camera
camera.post('/', validateBody(cameraSchema), async (c: CustomContext) => {
  try {
    const userId = c.get('userId');
    const validatedData = c.get('validatedBody');
    
    const cam = await prisma.camera.create({
      data: { ...validatedData, userId },
    });
    return c.json(cam);
  } catch (error) {
    return c.json({ error: 'Failed to create camera' }, 500);
  }
});

// Update camera
camera.put('/:id', validateBody(cameraSchema), async (c: CustomContext) => {
  try {
    const { id } = c.req.param();
    await idSchema.validateAsync(id);
    
    const validatedData = c.get('validatedBody');
    const cam = await prisma.camera.update({
      where: { id },
      data: validatedData,
    });
    return c.json(cam);
  } catch (error) {
    // if (error instanceof ValidationError) {
    //   return c.json({ error: 'Invalid camera ID' }, 400);
    // }
    return c.json({ error: 'Failed to update camera' }, 500);
  }
});

// Delete camera
camera.delete('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    await idSchema.validateAsync(id);
    
    await prisma.camera.delete({ where: { id } });
    return c.json({ success: true });
  } catch (error) {
    // if (error instanceof ValidationError) {
    //   return c.json({ error: 'Invalid camera ID' }, 400);
    // }
    return c.json({ error: 'Failed to delete camera' }, 500);
  }
});

// Start/Stop camera stream (placeholder)
camera.post('/:id/start', async (c) => {
  // TODO: Integrate worker to start stream
  return c.json({ started: true });
});
camera.post('/:id/stop', async (c) => {
  // TODO: Integrate worker to stop stream
  return c.json({ stopped: true });
});

export default camera;
