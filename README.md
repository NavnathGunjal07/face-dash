# face-dash

A scalable real-time face detection system with a React frontend and Node.js backend, supporting multiple camera streams and live detection alerts.

## Project Structure

```
├── frontend/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── camera/       # Camera-related components
│   │   │   └── shared/       # Shared UI components
│   │   ├── pages/            # Page components
│   │   ├── store/            # Redux store configuration
│   │   ├── api/              # API client setup
│   │   ├── hooks/            # Custom React hooks
│   │   ├── context/          # React context providers
│   │   └── utils/            # Utility functions
│   ├── public/               # Static assets
│   └── vite.config.ts        # Vite configuration
│
├── backend/                   # Node.js + TypeScript backend
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── models/           # Data models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Express middleware
│   │   └── utils/            # Utility functions
│   ├── prisma/               # Database schema and migrations
│   └── generated/            # Generated Prisma client
│
├── .github/                  # GitHub configurations
├── package.json             # Root package.json
├── turbo.json              # Turborepo configuration
└── .env                    # Environment variables
```

## Prerequisites

- Node.js >= 16.0.0
- PNPM >= 8.0.0
- PostgreSQL >= 14
- Redis (for session management)

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/NavnathGunjal07/face-dash.git
   cd face-dash
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**

   Create a \`.env\` file in the root directory:
   ```env
   # Backend
   DATABASE_URL="postgresql://user:password@localhost:5432/face_detection"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="your-jwt-secret"
   PORT=3000

   # Frontend
   VITE_API_URL="http://localhost:3000"
   VITE_WS_URL="ws://localhost:3000"
   ```

4. **Initialize the database:**
   ```bash
   cd backend
   pnpm prisma migrate dev
   ```

## Development

Start both frontend and backend in development mode:

```bash
pnpm dev
```

Or individually:

- Frontend (http://localhost:5173):
  ```bash
  cd frontend
  pnpm dev
  ```

- Backend (http://localhost:3000):
  ```bash
  cd backend
  pnpm dev
  ```

## API Endpoints

### Authentication

- **POST /api/auth/login**
  - Login with username and password
  - Returns JWT token

- **POST /api/auth/register**
  - Register new user
  - Required fields: username, password, email

### Cameras

- **GET /api/cameras**
  - List all cameras
  - Requires authentication

- **POST /api/cameras**
  - Add new camera
  - Required fields: name, rtspUrl, location
  - Requires authentication

- **PUT /api/cameras/:id**
  - Update camera settings
  - Requires authentication

- **DELETE /api/cameras/:id**
  - Remove camera
  - Requires authentication

### Face Detection

- **WebSocket /ws/detection/:cameraId**
  - Real-time face detection events
  - Events:
    - \`face_detected\`: New face detected
    - \`face_match\`: Face matched with database
    - \`alert\`: Security alert

## Building for Production

Build all packages:

```bash
pnpm build
```

The frontend build will be in \`frontend/dist\` and backend in \`backend/dist\`.

## Testing

Run tests for all packages:

```bash
pnpm test
```

## Features

- 🎥 Multi-camera support with RTSP streams
- 👤 Real-time face detection and recognition
- 🔔 Live alerts and notifications
- 📊 Dashboard with camera analytics
- 🔒 JWT authentication and role-based access
- 🎨 Dark theme UI with Tailwind CSS
- 📱 Responsive design

## Tech Stack

### Frontend
- React + TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Redux Toolkit for state management
- Axios for API calls
- WebSocket for real-time updates

### Backend
- Node.js + TypeScript
- Express.js for API
- Prisma for database ORM
- PostgreSQL for database
- Redis for caching
- JWT for authentication
- WebSocket for real-time communication

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## Author

Your Name
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourusername)