import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';

const menuResponse = {
  restaurant: 'COSMO BURGER',
  taxRate: 0.10,
  categories: [
    {
      name: 'Burgers',
      icon: 'burger',
      items: [
        { id: 1, name: 'La Atómica', description: 'Test burger', price: 9.99 }
      ]
    }
  ]
};

const chatResponse = {
  message: '¡Bienvenido a Cosmo Burger!',
  command: '',
  order: { items: [], subtotal: 0, tax: 0, total: 0 }
};

vi.stubGlobal('fetch', vi.fn((url: string) => {
  if (url.includes('/menu')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(menuResponse),
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(chatResponse),
  });
}));

vi.stubGlobal('SpeechRecognition', undefined);
vi.stubGlobal('webkitSpeechRecognition', undefined);

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });

  it('shows the restaurant name', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('COSMO BURGER')).toBeInTheDocument();
    });
  });
});
