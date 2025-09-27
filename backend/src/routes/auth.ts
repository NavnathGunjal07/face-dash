import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { signJwt } from '../utils/jwt';
import { prisma } from '../lib/prisma';
const auth = new Hono();

// Register endpoint
auth.post('/register', async (c) => {
  try {
    const { username, password } = await c.req.json();

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return c.json({ 
        error: 'Username already exists',
        field: 'username'
      }, 400);
    }

    // Validate password length
    if (password.length < 6) {
      return c.json({ 
        error: 'Password must be at least 6 characters long',
        field: 'password'
      }, 400);
    }

    // Validate username length and characters
    if (username.length < 3) {
      return c.json({ 
        error: 'Username must be at least 3 characters long',
        field: 'username'
      }, 400);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return c.json({ 
        error: 'Username can only contain letters, numbers, and underscores',
        field: 'username'
      }, 400);
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed },
    });

    return c.json({ 
      message: 'Registration successful',
      user: { id: user.id, username: user.username }
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ 
      error: 'An error occurred during registration',
    }, 500);
  }
});

// Login endpoint
auth.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();

    // Validate input presence
    if (!username || !password) {
      return c.json({ 
        error: 'Username and password are required',
        field: !username ? 'username' : 'password'
      }, 400);
    }

    const user = await prisma.user.findUnique({ where: { username } });
    
    // Don't reveal whether username exists or password is wrong
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return c.json({ 
        error: 'Invalid username or password'
      }, 401);
    }

    const token = signJwt({ userId: user.id });
    return c.json({ 
      message: 'Login successful',
      user: { id: user.id, username: user.username },
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ 
      error: 'An error occurred during login'
    }, 500);
  }
});

export default auth;
