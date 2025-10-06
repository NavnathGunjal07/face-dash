# Real-Time Multi-Camera Face Detection Dashboard

## Setup Instructions

### 1. Neon PostgreSQL Database Setup

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy your connection string from the dashboard
4. Update the `config.env` file with your Neon database credentials:

```env
DATABASE_URL=postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/database_name?sslmode=require
```

### 2. Environment Configuration

The project uses `config.env` file for environment variables. Make sure to:

1. Copy `config.env` to `.env` (if you prefer the standard naming)
2. Update all the values with your actual credentials
3. Keep the file secure and never commit it to version control

### 3. Database Migration

Run the Prisma migration to set up your database schema:

```bash
cd backend
npx prisma migrate deploy
```

### 4. Running the Services

Start the backend and worker services:

```bash
docker-compose up -d
```

This will start:
- **Backend API** (port 3000)
- **WebSocket Server** (port 3001) 
- **Worker Service** (port 8080)
- **MediaMTX Streaming Server** (ports 8888, 8889, 8554, 1935)

### 5. Frontend Deployment

The frontend has been removed from this docker-compose setup as it will be deployed separately. Make sure your frontend is configured to connect to:

- API: `http://your-backend-domain:3000`
- WebSocket: `ws://your-backend-domain:3001`
- MediaMTX: `http://your-backend-domain:8888`

### 6. Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Secret key for JWT authentication | `your-super-secret-key` |
| `PORT` | Backend API port | `3000` |
| `WS_PORT` | WebSocket server port | `3001` |
| `WORKER_URL` | Worker service URL | `http://worker:8080` |
| `MEDIAMTX_URL` | MediaMTX streaming server URL | `http://mediamtx:8888` |
| `NODE_ENV` | Environment mode | `development` or `production` |

### 7. Security Notes

- Change the `JWT_SECRET` to a strong, random string in production
- Use environment-specific database credentials
- Ensure your Neon database has proper access controls configured
- Consider using connection pooling for production workloads