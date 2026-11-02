import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CustomerBookingPage } from '../CustomerBookingPage';
import { BrowserRouter } from 'react-router-dom';

// Polyfill ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock MapViewer & react-leaflet
vi.mock('../../components/MapViewer', () => ({
  MapViewer: () => <div data-testid="map-viewer" />,
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  Polyline: () => <div data-testid="polyline" />,
  useMap: () => ({
    setView: vi.fn(),
    fitBounds: vi.fn(),
  }),
}));

// Mock SocketContext
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({
    isConnected: true,
    subscribeToRide: vi.fn().mockReturnValue(vi.fn()),
    unsubscribeFromRide: vi.fn(),
  }),
}));

// Mock AuthContext
const mockUser = {
  id: 'usr-male-123',
  fullName: 'Rahul Sharma',
  email: 'rahul@example.com',
  phoneNumber: '+919876543210',
  role: 'CUSTOMER',
  gender: 'MALE',
  ratingAvg: 4.8,
  createdAt: '2026-01-01',
};

let currentMockUser = { ...mockUser };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: currentMockUser,
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
          {
            category: 'WOMEN_BIKE',
            categoryName: 'Women-Only Bike',
            etaText: '3 mins away',
            distanceKm: 4.5,
            durationMinutes: 12,
            baseFare: 25.0,
            distanceCharge: 40.5,
            timeCharge: 18.0,
            bookingFee: 5.0,
            taxAmount: 4.43,
            discountAmount: 0.0,
            totalFare: 92.93,
            isAvailable: true,
          },
        ],
      }),
      book: vi.fn().mockResolvedValue({
        id: 'ride-123',
        status: 'SEARCHING',
        estimatedFare: 92.93,
        vehicleCategory: 'WOMEN_BIKE',
      }),
    },
    customer: {
      getActiveRide: vi.fn().mockResolvedValue(null),
    },
    geo: {
      search: vi.fn().mockResolvedValue([]),
      reverse: vi.fn().mockResolvedValue({ displayName: 'MG Road' }),
      route: vi.fn().mockResolvedValue({
        distanceKm: 4.5,
        durationMinutes: 12,
        geometry: [[12.9756, 77.6066], [12.9352, 77.6245]],
      }),
    },
  },
}));

import { api } from '../../services/api';

describe('Women-Only Bike Customer Booking Workflow', () => {
  beforeEach(() => {
    currentMockUser = { ...mockUser };
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <CustomerBookingPage />
      </BrowserRouter>
    );

  it('renders booking page and shows Women-Only option after loading estimates', async () => {
    renderComponent();

    const womenBikeCard = await screen.findByText('Women-Only Bike');
    expect(womenBikeCard).toBeInTheDocument();
  });

  it('shows traveler selection card when WOMEN_BIKE is selected', async () => {
    renderComponent();

    const womenBikeCard = await screen.findByText('Women-Only Bike');
    fireEvent.click(womenBikeCard);

    expect(await screen.findByText('Who is Traveling?')).toBeInTheDocument();
    expect(screen.getByText('For Myself')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Book for Someone Else/i })).toBeInTheDocument();
    expect(screen.getByText(/Demo Verification Acknowledgment/i)).toBeInTheDocument();
  });

  it('flags ineligibility when a male account books Women-Only for himself', async () => {
    currentMockUser = { ...mockUser, gender: 'MALE' };
    renderComponent();

    const womenBikeCard = await screen.findByText('Women-Only Bike');
    fireEvent.click(womenBikeCard);

    expect(await screen.findByText(/Your account is registered as Male/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Request Captain/i });
    fireEvent.click(confirmBtn);

    // Validation prevents booking and displays the error message
    expect(
      await screen.findByText(/Women-Only Bike bookings are reserved exclusively for women passengers/i)
    ).toBeInTheDocument();
    expect(api.rides.book).not.toHaveBeenCalled();
  });

  it('allows a male account to book Women-Only when booking for a female relative', async () => {
    currentMockUser = { ...mockUser, gender: 'MALE' };
    renderComponent();

    const womenBikeCard = await screen.findByText('Women-Only Bike');
    fireEvent.click(womenBikeCard);

    const someoneElseBtn = await screen.findByRole('button', { name: /Book for Someone Else/i });
    fireEvent.click(someoneElseBtn);

    expect(screen.getByPlaceholderText(/e\.g\. Sunita Sharma/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\+91 98765 43210/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sunita Sharma/i), {
      target: { value: 'Priya Sharma' },
    });
    fireEvent.change(screen.getByPlaceholderText(/\+91 98765 43210/i), {
      target: { value: '+919123456789' },
    });

    // Ineligible notice should not be present
    expect(screen.queryByText(/Your account is registered as Male/i)).not.toBeInTheDocument();

    const bookButton = screen.getByRole('button', { name: /Confirm & Request Captain/i });
    fireEvent.click(bookButton);

    await waitFor(() => {
      expect(api.rides.book).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleCategory: 'WOMEN_BIKE',
          isForSomeoneElse: true,
          travelerName: 'Priya Sharma',
          travelerPhone: '+919123456789',
          travelerGender: 'FEMALE',
          passengerDeclarationAcknowledged: true,
        })
      );
    });
  });

  it('shows eligible status and books directly for a female account booking for herself', async () => {
    currentMockUser = { ...mockUser, gender: 'FEMALE' };
    renderComponent();

    const womenBikeCard = await screen.findByText('Women-Only Bike');
    fireEvent.click(womenBikeCard);

    expect(screen.queryByText(/Your account is registered as Male/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Self-declaration: Eligible female traveler for Women-Only service/i)
    ).toBeInTheDocument();

    const bookButton = await screen.findByRole('button', { name: /Confirm & Request Captain/i });
    fireEvent.click(bookButton);

    await waitFor(() => {
      expect(api.rides.book).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleCategory: 'WOMEN_BIKE',
          isForSomeoneElse: false,
          travelerGender: 'FEMALE',
          passengerDeclarationAcknowledged: true,
        })
      );
    });
  });
});
