import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'supersecret';

export const signJwt = (payload: object) => jwt.sign(payload, SECRET, { expiresIn: '7d' });
export const verifyJwt = (token: string) => {
  try {
    return jwt.verify(token, SECRET) as any;
  } catch {
    return null;
  }
};
