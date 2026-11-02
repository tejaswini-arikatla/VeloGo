import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CaptainDashboardPage } from '../CaptainDashboardPage';
import { BrowserRouter } from 'react-router-dom';

// Polyfill ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { mockCaptainUser } = vi.hoisted(() => ({
  mockCaptainUser: {
    id: 'usr-capt-1',
    fullName: 'Rahul Verma (Bike Captain)',
    email: 'captain.rahul@velogo.com',
    phoneNumber: '+919876543220',
    role: 'ROLE_CAPTAIN',
    gender: 'MALE',
    captainProfile: {
      captainId: 'cp-001',
      verificationStatus: 'APPROVED',
      online: true,
      available: true,
      womenOnlyEligible: false,
      womenOnlyStatus: 'NOT_APPLIED',
      ratingAvg: 4.92,
      totalRides: 142,
      totalEarnings: 18500.0,
      currentLatitude: 12.9716,
      currentLongitude: 77.5946,
      vehicle: {
        id: 'v-001',
        category: 'BIKE',
        model: 'Honda Activa 6G',
        registrationNumber: 'KA-01-EQ-1234',
        color: 'Matte Yellow',
      },
    },
  },
}));

// Mock MapViewer
vi.mock('../../components/MapViewer', () => ({
  MapViewer: () => <div data-testid="map-viewer" />,
}));

// Mock SocketContext
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({
    isConnected: true,
    subscribeToCaptainDispatch: vi.fn().mockReturnValue(vi.fn()),
    subscribeToRide: vi.fn().mockReturnValue(vi.fn()),
  }),
}));

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockCaptainUser,
    token: 'mock-token',
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

// Mock API
vi.mock('../../services/api', () => ({
  api: {
    captain: {
      getProfile: vi.fn().mockResolvedValue(mockCaptainUser.captainProfile),
      getActiveRide: vi.fn().mockResolvedValue(null),
      getHistory: vi.fn().mockResolvedValue([
        {
          id: 'ride-hist-1',
          customerName: 'Anita Roy',
          pickupAddress: 'MG Road Metro Station',
          destAddress: 'Koramangala 5th Block',
          distanceKm: 4.8,
          finalFare: 75.0,
          status: 'COMPLETED',
          vehicleCategory: 'BIKE',
          createdAt: '2026-10-25T10:00:00Z',
        },
      ]),
      toggleAvailability: vi.fn().mockResolvedValue({
        ...mockCaptainUser.captainProfile,
        online: false,
      }),
      updateLocation: vi.fn().mockResolvedValue(undefined),
      arriveAtPickup: vi.fn().mockResolvedValue({ status: 'ARRIVED' }),
      startTrip: vi.fn().mockResolvedValue({ status: 'IN_PROGRESS' }),
      completeTrip: vi.fn().mockResolvedValue({ status: 'COMPLETED' }),
      applyWomenOnly: vi.fn().mockResolvedValue({
        ...mockCaptainUser.captainProfile,
        womenOnlyStatus: 'APPLIED',
      }),
    },
    geo: {
      reverse: vi.fn().mockResolvedValue({ displayName: 'MG Road Central, Bengaluru' }),
    },
  },
}));

describe('CaptainDashboardPage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Captain Dashboard with profile, stats, and tabs', async () => {
    render(
      <BrowserRouter>
        <CaptainDashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Rahul Verma (Bike Captain)')).toBeInTheDocument();
    expect(screen.getByText('Live Console & Radar')).toBeInTheDocument();
    expect(screen.getByText('Trip History (0)')).toBeInTheDocument();
    expect(screen.getByText('Vehicle & Documents')).toBeInTheDocument();
    expect(screen.getByText('Earnings & Analytics')).toBeInTheDocument();
  });

  it('switches between tabs cleanly', async () => {
    render(
      <BrowserRouter>
        <CaptainDashboardPage />
      </BrowserRouter>
    );

    // Switch to Vehicle & Documents
    fireEvent.click(screen.getByText('Vehicle & Documents'));
    expect(screen.getByText('Registered Vehicle')).toBeInTheDocument();
    expect(screen.getByText('Commercial Driving License')).toBeInTheDocument();

    // Switch to Earnings & Analytics
    fireEvent.click(screen.getByText('Earnings & Analytics'));
    expect(screen.getByText('Earnings & Payouts')).toBeInTheDocument();
    expect(screen.getByText('Emergency 24x7 SOS')).toBeInTheDocument();

    // Switch to Trip History
    fireEvent.click(screen.getByText(/Trip History/i));
    await waitFor(() => {
      expect(screen.getByText('Completed Trips')).toBeInTheDocument();
    });
  });

  it('allows triggering a demo simulated dispatch offer', async () => {
    render(
      <BrowserRouter>
        <CaptainDashboardPage />
      </BrowserRouter>
    );

    const testOfferBtn = screen.getByText('Test: Simulate Ride Offer');
    fireEvent.click(testOfferBtn);

    expect(screen.getByText('NEW RIDE DISPATCH')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma (Demo Rider)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept Ride/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pass \/ Reject/i })).toBeInTheDocument();
  });

  it('can reject an incoming dispatch offer', async () => {
    render(
      <BrowserRouter>
        <CaptainDashboardPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Test: Simulate Ride Offer'));
    expect(screen.getByText('NEW RIDE DISPATCH')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pass \/ Reject/i }));
    expect(screen.queryByText('NEW RIDE DISPATCH')).not.toBeInTheDocument();
  });
});
