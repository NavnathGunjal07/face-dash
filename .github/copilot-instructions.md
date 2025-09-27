# Copilot Instructions for AI Coding Agents

## Project Overview
This workspace is for a real-time multi-camera face detection dashboard frontend, built with React, TypeScript, Vite, TailwindCSS, Zustand, Axios, and WebSocket. The backend is assumed to provide JWT authentication, camera management, and WebRTC feeds.

## Immediate Guidance for AI Agents
### Key Stack & Structure
- React + TypeScript + Vite (frontend)
- TailwindCSS for UI
- Redux Toolkit for global state (cameras)
- Axios for API (JWT via localStorage, interceptors)
- WebSocket for real-time alerts
- react-router-dom for routing

### Error Handling & API Integration Best Practices
#### Frontend Components
1. **State Management**:
   ```typescript
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState('');
   const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
   ```

2. **API Error Interface**:
   ```typescript
   interface ApiError {
     error: string;
     field?: string;
     message?: string;
   }
   ```

3. **Try-Catch Pattern**:
   ```typescript
   const handleSubmit = async () => {
     try {
       setIsLoading(true);
       setError('');
       setFieldErrors({});
       
       const response = await api.post('/endpoint', data);
       // Handle success
     } catch (err: any) {
       const apiError = err.response?.data as ApiError;
       if (apiError?.field) {
         setFieldErrors({ [apiError.field]: apiError.error });
       } else {
         setError(apiError?.error || 'An unexpected error occurred');
       }
     } finally {
       setIsLoading(false);
     }
   };
   ```

4. **Loading States**:
   ```typescript
   <button 
     disabled={isLoading}
     className="relative disabled:bg-opacity-70"
   >
     {isLoading ? (
       <>
         <span className="opacity-0">Submit</span>
         <LoadingSpinner />
       </>
     ) : (
       'Submit'
     )}
   </button>
   ```

5. **Form Fields with Errors**:
   ```typescript
   <div className="mb-4">
     <input
       className={fieldErrors.fieldName ? 'border-red-500' : ''}
       disabled={isLoading}
     />
     {fieldErrors.fieldName && (
       <p className="text-red-500 text-sm mt-1">{fieldErrors.fieldName}</p>
     )}
   </div>
   ```

#### Backend Routes
1. **Error Response Format**:
   ```typescript
   return c.json({ 
     error: 'Error message',
     field?: 'fieldName',
   }, statusCode);
   ```

2. **Try-Catch Pattern**:
   ```typescript
   try {
     // Validate input
     if (!isValid) {
       return c.json({ 
         error: 'Validation error',
         field: 'fieldName'
       }, 400);
     }

     // Process request
     const result = await processRequest();
     return c.json({ 
       message: 'Success message',
       data: result
     }, 200);
   } catch (error) {
     console.error('Operation failed:', error);
     return c.json({ 
       error: 'An unexpected error occurred'
     }, 500);
   }
   ```

3. **Input Validation**:
   ```typescript
   // Check required fields
   if (!field) {
     return c.json({ 
       error: 'Field is required',
       field: 'fieldName'
     }, 400);
   }

   // Validate field format/content
   if (!isValidFormat(field)) {
     return c.json({ 
       error: 'Invalid format',
       field: 'fieldName'
     }, 400);
   }
   ```

### Additional Guidelines
1. Always clear errors before new submissions
2. Disable form elements during loading
3. Show loading states for async operations
4. Handle both field-specific and general errors
5. Log errors on the backend
6. Use appropriate HTTP status codes
7. Provide clear error messages
8. Include field names in validation errors
9. Clean up resources in finally blocks
10. Validate input on both frontend and backend

### Folder Structure
- `src/pages/` — Login, Dashboard
- `src/components/` — CameraTile, shared UI
- `src/api/` — Axios instance
- `src/hooks/` — WebSocket hooks
- `src/store/` — Zustand camera store
- `src/context/` — AuthContext for JWT
- `src/tests/` — Example unit tests

### Developer Workflows
- **Install dependencies:** `pnpm install` (or `npm install`)
- **Run dev server:** `pnpm dev` (or `npm run dev`)
- **Run tests:** `pnpm test` (setup with Jest or Vitest)
- **Tailwind config:** See `tailwind.config.js` and `src/index.css`

### Patterns & Conventions
- JWT stored in localStorage, injected via Axios interceptor
- AuthContext provides session state
- Redux manages camera CRUD and state (see `src/store/cameraSlice.ts` and `src/store/store.ts`)
- WebSocket hooks for per-camera alerts
- Routing: `/login` (public), `/dashboard` (private)
- CameraTile: live video placeholder, controls, alerts
- Responsive grid via Tailwind
- Error handling: user feedback via UI, error states in context/components

### Integration Points
- Backend endpoints: `/auth/login`, `/api/cameras`, WebSocket `/alerts/{cameraId}`
- WebRTC video: placeholder, integrate with MediaMTX/backend as needed

### Example Onboarding
- Add new camera: dispatch `addCamera` from `cameraSlice` using Redux
- Add new alert type: update WebSocket hook/component
- Add new page: place in `src/pages/`, add route in `App.tsx`

## Next Steps

Update this file as the codebase evolves. Document new patterns, workflows, and integration details as they are added.

---
**Example future section (to be updated):**
- `src/face_detection/` contains core detection logic, using OpenCV and Dlib.
- `dashboard/` is a React frontend, communicating via REST API to `server/`.
- Use `npm run dev` to start the dashboard, and `python server/app.py` for backend.
- All API endpoints are documented in `server/api_spec.yaml`.

---
**This file should be updated as the codebase evolves.**
