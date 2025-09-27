import Joi from 'joi';

export interface CameraData {
  name: string;
  rtspUrl: string;
  location: string;
  enabled?: boolean;
}

export const cameraSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  rtspUrl: Joi.string().required().uri(),
  location: Joi.string().required().min(1).max(200),
  enabled: Joi.boolean()
});

export const idSchema = Joi.string().required();