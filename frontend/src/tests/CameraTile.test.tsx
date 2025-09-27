import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CameraTile from '../components/camera/CameraTile';
import { Provider } from 'react-redux';
import store from '../store/store';

const camera = {
  id: '1',
  name: 'Test Cam',
  location: 'Lab',
  rtspUrl: 'rtsp://test',
};

// describe('CameraTile', () => {
//   it('renders camera tile', () => {
//     render(
//       <Provider store={store}>
//         <CameraTile camera={camera} />
//       </Provider>
//     );
//     expect(screen.getByText(/Test Cam/)).toBeInTheDocument();
//     expect(screen.getByText(/Lab/)).toBeInTheDocument();
//     expect(screen.getByText(/Live Video/)).toBeInTheDocument();
//   });
// });
