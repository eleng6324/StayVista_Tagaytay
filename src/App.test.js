import { render, screen } from '@testing-library/react';
import App from './App';

test('renders StayVista Tagaytay login page', () => {
  render(<App />);
  expect(screen.getByText(/StayVista Tagaytay/i)).toBeInTheDocument();
  expect(screen.getByText(/Log in to your account/i)).toBeInTheDocument();
});
