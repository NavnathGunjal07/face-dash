import { Hono } from 'hono';
import type { Context } from 'hono';
import { prisma } from '../lib/prisma';
import { cameraSchema, idSchema, type CameraData } from '../schemas/camera.schema'
import { validateBody } from '../middleware/validation.middleware';
import axios from 'axios';

type CustomContext = Context & {
  get(key: 'userId'): string;
  get(key: 'validatedBody'): CameraData;
}

const camera = new Hono();

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8080';

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

// Start camera stream (notify worker and update state)
camera.post('/:id/start', async (c) => {
  try {
    const { id } = c.req.param();
    await idSchema.validateAsync(id);

    const userId = (c.get as any)('userId');

    const cam = await prisma.camera.findFirst({ where: { id, userId } });
    if (!cam) {
      return c.json({ error: 'Camera not found' }, 404);
    }

    await axios.post(`${WORKER_URL}/stream/start`, {
      id: cam.id,
      name: cam.name,
      rtsp_url: cam.rtspUrl,
      location: cam.location ?? '',
      enabled: true,
    });

    const updated = await prisma.camera.update({
      where: { id },
      data: { enabled: true },
    });

    return c.json({ started: true, camera: updated });
  } catch (error: any) {
    console.log(error)
    const msg = error?.response?.data || error?.message || 'Failed to start stream';
    return c.json({ error: `Failed to start stream: ${msg}` }, 500);
  }
});

// Stop camera stream (notify worker and update state)
camera.post('/:id/stop', async (c) => {
  try {
    const { id } = c.req.param();
    await idSchema.validateAsync(id);

    const userId = (c.get as any)('userId');

    const cam = await prisma.camera.findFirst({ where: { id, userId } });
    if (!cam) {
      return c.json({ error: 'Camera not found' }, 404);
    }

    await axios.post(`${WORKER_URL}/stream/stop/${id}`);

    const updated = await prisma.camera.update({
      where: { id },
      data: { enabled: false },
    });

    return c.json({ stopped: true, camera: updated });
  } catch (error: any) {
    const msg = error?.response?.data || error?.message || 'Failed to stop stream';
    return c.json({ error: `Failed to stop stream: ${msg}` }, 500);
  }
});

// Get stream status (proxy to worker)
camera.get('/:id/status', async (c) => {
  try {
    const { id } = c.req.param();
    await idSchema.validateAsync(id);

    const userId = (c.get as any)('userId');

    const cam = await prisma.camera.findFirst({ where: { id, userId } });
    if (!cam) {
      return c.json({ error: 'Camera not found' }, 404);
    }

    const { data: allStatus } = await axios.get(`${WORKER_URL}/stream/status`);
    const status = (allStatus as any)[id] ?? null;
    return c.json({ camera_id: id, status });
  } catch (error: any) {
    const msg = error?.response?.data || error?.message || 'Failed to get stream status';
    return c.json({ error: `Failed to get stream status: ${msg}` }, 500);
  }
});
export default camera;
