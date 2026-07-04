import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';

describe('CRM web', () => {
  beforeEach(() => sessionStorage.clear());
  it('renders an accessible demo login', () => {
    render(<App />);
    expect(screen.getByText(/bienvenido de nuevo/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /ingresar al crm/i })).toBeTruthy();
  });
});
