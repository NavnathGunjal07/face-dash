import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
const alert = new Hono();

// Get alerts with pagination and filtering
alert.get('/', async (c) => {
  const { cameraId, page = 1, pageSize = 10 } = c.req.query();
  const where = cameraId ? { cameraId } : {};
  const alerts = await prisma.alert.findMany({
    where,
    orderBy: { detectedAt: 'desc' },
    skip: (Number(page) - 1) * Number(pageSize),
    take: Number(pageSize),
    include: {
      camera: {
        select: {
          name: true,
          location: true
        }
      }
    }
  });
  return c.json(alerts);
});

// Create a new alert
alert.post('/', async (c) => {
  const { cameraId, description, snapshotUrl, metadata } = await c.req.json();
  const newAlert = await prisma.alert.create({
    data: {
      cameraId,
      description,
      snapshotUrl,
      metadata: metadata || {},
    },
    include: {
      camera: {
        select: {
          name: true,
          location: true
        }
      }
    }
  });
  return c.json(newAlert);
});

export default alert;
