import { verifyJwt } from '../utils/jwt';

export const authMiddleware = async (c: any, next: () => Promise<void>) => {
  const auth = c.req.header('authorization');
  if (!auth) return c.json({ error: 'Missing token' }, 401);
  const token = auth.replace('Bearer ', '');
  const payload = verifyJwt(token);
  if (!payload) return c.json({ error: 'Invalid token' }, 401);
  c.set('userId', payload.userId);
  await next();
};
