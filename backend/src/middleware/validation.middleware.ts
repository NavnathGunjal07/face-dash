import type { Context, Next } from 'hono';
import Joi from 'joi';

type ValidatedContext = Context & {
  set(key: 'validatedBody', value: unknown): void;
};

type ValidationMiddleware = (c: ValidatedContext, next: Next) => Promise<Response | void>;

export const validateBody = (schema: Joi.ObjectSchema): ValidationMiddleware => async (c, next) => {
  try {
    const body = await c.req.json();
    await schema.validateAsync(body, { abortEarly: false });
    c.set('validatedBody', body);
    await next();
  } catch (error: any) {
    return c.json({
      error: 'Validation Error',
      details: error.details?.map((d: any) => d.message)
    }, 400);
  }
};