import { Hono } from 'hono';
import type { Context } from 'hono';
import { prisma } from '../lib/prisma';
import { cameraSchema, idSchema, type CameraData } from '../schemas/camera.schema'
import { validateBody } from '../middleware/validation.middleware';