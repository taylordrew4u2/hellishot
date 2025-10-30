import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Hell Is Hot heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/Hell Is Hot/i);
  expect(headingElement).toBeInTheDocument();
});

test('renders time blocks', () => {
  render(<App />);
  const timeBlockElement = screen.getByText(/5:30 - 6:15 PM/i);
  expect(timeBlockElement).toBeInTheDocument();
});

test('renders performance fee notice', () => {
  render(<App />);
  const feeElement = screen.getByText(/Performance fee: \$3/i);
  expect(feeElement).toBeInTheDocument();
});
