import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Camera {
  id: string;
  name: string;
  location: string;
  rtspUrl: string;
}

interface CameraState {
  cameras: Camera[];
}

const initialState: CameraState = {
  cameras: [],
};

const cameraSlice = createSlice({
  name: 'cameras',
  initialState,
  reducers: {
    addCamera(state, action: PayloadAction<Camera>) {
      state.cameras.push(action.payload);
    },
    removeCamera(state, action: PayloadAction<string>) {
      state.cameras = state.cameras.filter(c => c.id !== action.payload);
    },
    updateCamera(state, action: PayloadAction<Camera>) {
      state.cameras = state.cameras.map(c => c.id === action.payload.id ? action.payload : c);
    },
  },
});

export const { addCamera, removeCamera, updateCamera } = cameraSlice.actions;
export default cameraSlice.reducer;
