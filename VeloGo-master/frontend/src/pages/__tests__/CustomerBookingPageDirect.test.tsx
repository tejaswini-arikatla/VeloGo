import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CustomerBookingPage } from '../CustomerBookingPage';
import { BrowserRouter } from 'react-router-dom';

// Polyfill ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock SocketContext
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({
    isConnected: true,
    subscribeToRide: vi.fn().mockReturnValue(vi.fn()),
    unsubscribeFromRide: vi.fn(),
  }),
}));

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-male-123',
      fullName: 'Rahul Sharma',
      email: 'rahul@example.com',
      phoneNumber: '+919876543210',
      role: 'CUSTOMER',
      gender: 'MALE',
      ratingAvg: 4.8,
      createdAt: '2026-01-01',
    },
    token: 'mock-token',
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock API
vi.mock('../../services/api', () => ({
  api: {
    rides: {
      estimate: vi.fn().mockResolvedValue({
        distanceKm: 4.5,
        durationMinutes: 12,
        routeGeometry: [
          [12.9756, 77.6066],
          [12.9352, 77.6245],
        ],
        estimates: [
          {
            category: 'BIKE',
            categoryName: 'VeloGo Bike',
            etaText: '2 mins away',
            distanceKm: 4.5,
            durationMinutes: 12,
            baseFare: 25.0,
            distanceCharge: 40.5,
            timeCharge: 18.0,
            bookingFee: 5.0,
            taxAmount: 4.43,
            discountAmount: 0.0,
            totalFare: 72.93,
            isAvailable: true,
          },
        ],
      }),
      book: vi.fn(),
    },
    customer: {
      getActiveRide: vi.fn().mockResolvedValue(null),
    },
    geo: {
      search: vi.fn().mockResolvedValue([]),
      reverse: vi.fn().mockResolvedValue({ displayName: 'Test address' }),
    },
  },
}));

describe('CustomerBookingPage with real MapViewer', () => {
  it('renders CustomerBookingPage without crashing', async () => {
    const { container } = render(
      <BrowserRouter>
        <CustomerBookingPage />
      </BrowserRouter>
    );
    expect(container).toBeTruthy();
    expect(screen.getByText('Book a Ride')).toBeInTheDocument();
  });

  it('handles React StrictMode double-mounting without Map container already initialized error', () => {
    const { unmount } = render(
      <BrowserRouter>
        <CustomerBookingPage />
      </BrowserRouter>
    );
    unmount();

    // Second mount in same test simulates React 18/19 StrictMode remounting
    const { container } = render(
      <BrowserRouter>
        <CustomerBookingPage />
      </BrowserRouter>
    );
    expect(container).toBeTruthy();
    expect(screen.getByText('Book a Ride')).toBeInTheDocument();
  });
});
