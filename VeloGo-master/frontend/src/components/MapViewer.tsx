import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Crosshair, Loader2, Maximize2 } from 'lucide-react';

export interface MapLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface MapViewerProps {
  pickup?: MapLocation;
  destination?: MapLocation;
  captainLocation?: { lat: number; lng: number };
  currentLocation?: { lat: number; lng: number };
  routeGeometry?: [number, number][];
  routeDistanceKm?: number;
  routeDurationMins?: number;
  onMapClick?: (lat: number, lng: number) => void;
  onPickupChange?: (loc: MapLocation) => void;
  onDestinationChange?: (loc: MapLocation) => void;
  selectionMode?: 'pickup' | 'destination' | null;
  onSelectionModeChange?: (mode: 'pickup' | 'destination' | null) => void;
  onLocateUser?: () => void;
  isLocating?: boolean;
  className?: string;
  zoom?: number;
  interactiveSelectionPopup?: boolean;
  showPinControls?: boolean;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  pickup,
  destination,
  captainLocation,
  currentLocation,
  routeGeometry,
  routeDistanceKm,
  routeDurationMins,
  onMapClick,
  onPickupChange,
  onDestinationChange,
  selectionMode,
  onSelectionModeChange,
  onLocateUser,
  isLocating = false,
  className = 'h-[400px] w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200',
  zoom = 13,
  interactiveSelectionPopup = true,
  showPinControls = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clickPopupRef = useRef<L.Popup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const markersRef = useRef<{
    currentLoc?: L.Marker;
    pickup?: L.Marker;
    dest?: L.Marker;
    captain?: L.Marker;
    routeCasing?: L.Polyline;
    routeHighlight?: L.Polyline;
    routeFlow?: L.Polyline;
    startBadge?: L.Marker;
    finishBadge?: L.Marker;
  }>({});

  // Callbacks in refs to avoid stale closures
  const onMapClickRef = useRef(onMapClick);
  const onPickupChangeRef = useRef(onPickupChange);
  const onDestinationChangeRef = useRef(onDestinationChange);
  const selectionModeRef = useRef(selectionMode);
  const onLocateUserRef = useRef(onLocateUser);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
    onPickupChangeRef.current = onPickupChange;
    onDestinationChangeRef.current = onDestinationChange;
    selectionModeRef.current = selectionMode;
    onLocateUserRef.current = onLocateUser;
  }, [onMapClick, onPickupChange, onDestinationChange, selectionMode, onLocateUser]);

  // Custom styled div icons with vibrant glow and draggable handle
  const createPinIcon = (color: string, label: string, isDraggable = true, emoji = '📍') => {
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: ${isDraggable ? 'grab' : 'pointer'};">
          <div style="background-color: ${color}; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; box-shadow: 0 6px 16px rgba(0,0,0,0.35); white-space: nowrap; margin-bottom: 3px; border: 2px solid white; display: flex; align-items: center; gap: 4px;">
            <span>${emoji}</span>
            <span>${label}</span>
            ${isDraggable ? '<span style="font-size: 9px; opacity: 0.9; font-weight: 600; background: rgba(0,0,0,0.2); padding: 1px 4px; border-radius: 6px;">drag</span>' : ''}
          </div>
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 34px; height: 34px; background: ${color}; opacity: 0.28; border-radius: 50%; animation: pulse-ring 2s infinite;"></div>
            <div style="width: 24px; height: 24px; background-color: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"></div>
            <div style="position: absolute; width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
          </div>
        </div>
      `,
      iconSize: [36, 52],
      iconAnchor: [18, 52],
      popupAnchor: [0, -52],
    });
  };

  const createCurrentLocationIcon = () => {
    return L.divIcon({
      className: 'custom-current-location',
      html: `
        <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 30px; height: 30px; background: rgba(14, 165, 233, 0.45); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 16px; height: 16px; background: #0284c7; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.35);"></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  const createCaptainIcon = () => {
    return L.divIcon({
      className: 'custom-captain-pin',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 44px; height: 44px; background: #0f172a; border: 3px solid #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(245, 158, 11, 0.85);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
            </svg>
          </div>
          <div style="background: #0f172a; color: #f59e0b; border: 1px solid #f59e0b; font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 6px; margin-top: 2px;">
            CAPTAIN
          </div>
        </div>
      `,
      iconSize: [44, 58],
      iconAnchor: [22, 29],
    });
  };

  const createWayBadgeIcon = (text: string, bg: string, color: string) => {
    return L.divIcon({
      className: 'custom-way-badge',
      html: `
        <div style="background: ${bg}; color: ${color}; border: 2px solid white; font-size: 10px; font-weight: 900; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 9999px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); white-space: nowrap;">
          ${text}
        </div>
      `,
      iconSize: [60, 20],
      iconAnchor: [30, 10],
    });
  };

  // State to trigger marker updates when map is ready
  const [mapReady, setMapReady] = useState(0);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const container = mapContainerRef.current as any;

    // Defensively handle React 18/19 StrictMode remounts or HMR updates
    if (container._leaflet_id) {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      delete container._leaflet_id;
    }

    const initialLat =
      pickup?.lat && !isNaN(pickup.lat)
        ? pickup.lat
        : currentLocation?.lat && !isNaN(currentLocation.lat)
        ? currentLocation.lat
        : 12.9756;
    const initialLng =
      pickup?.lng && !isNaN(pickup.lng)
        ? pickup.lng
        : currentLocation?.lng && !isNaN(currentLocation.lng)
        ? currentLocation.lng
        : 77.6066;

    let map: L.Map;
    try {
      map = L.map(container, {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: false, // Use SVG for rich styling, animations, and glowing filters
      }).setView([initialLat, initialLng], zoom);
    } catch (err) {
      console.error('Leaflet map creation error:', err);
      return;
    }

    // High-performance OpenStreetMap raster tiles with generous buffer to prevent blank spaces
    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | VeloGo',
      maxZoom: 19,
      keepBuffer: 8,
      updateWhenIdle: false,
      updateWhenZooming: true,
      crossOrigin: true,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Map Click Handler: Supports direct click mode & interactive location choice popup
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      // Always notify onMapClick if provided
      if (onMapClickRef.current) {
        onMapClickRef.current(lat, lng);
      }

      const mode = selectionModeRef.current;
      if (mode === 'pickup') {
        onPickupChangeRef.current?.({ lat, lng });
        if (clickPopupRef.current) map.closePopup(clickPopupRef.current);
        return;
      } else if (mode === 'destination') {
        onDestinationChangeRef.current?.({ lat, lng });
        if (clickPopupRef.current) map.closePopup(clickPopupRef.current);
        return;
      }

      // If no explicit mode is toggled, offer interactive choice popup directly on map
      if (interactiveSelectionPopup && (onPickupChangeRef.current || onDestinationChangeRef.current)) {
        const popupContent = document.createElement('div');
        popupContent.style.textAlign = 'center';
        popupContent.style.padding = '6px 4px';
        popupContent.style.fontFamily = 'Inter, system-ui, sans-serif';

        popupContent.innerHTML = `
          <div style="margin-bottom: 8px;">
            <p style="font-weight: 800; font-size: 13px; margin: 0; color: #0f172a; display: flex; align-items: center; justify-content: center; gap: 4px;">
              <span>📍</span> <span>Pin Location</span>
            </p>
            <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">
              ${lat.toFixed(4)}, ${lng.toFixed(4)}
            </p>
          </div>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button id="map-pop-pickup" style="background: linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; padding:8px 14px; border-radius:12px; font-weight:800; font-size:11px; cursor:pointer; box-shadow:0 3px 8px rgba(16,185,129,0.4); display:flex; align-items:center; gap:5px; transition: transform 0.1s;">
              🟢 Set as Pickup
            </button>
            <button id="map-pop-dest" style="background: linear-gradient(135deg, #ef4444, #dc2626); color:#fff; border:none; padding:8px 14px; border-radius:12px; font-weight:800; font-size:11px; cursor:pointer; box-shadow:0 3px 8px rgba(239,68,68,0.4); display:flex; align-items:center; gap:5px; transition: transform 0.1s;">
              🔴 Set as Drop-off
            </button>
          </div>
          ${onLocateUserRef.current ? `
            <div style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
              <button id="map-pop-locate" style="background: #f0fdf4; color: #047857; border: 1px solid #a7f3d0; width: 100%; padding: 6px 10px; border-radius: 10px; font-weight: 800; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                🎯 Use Current Location for Pickup
              </button>
            </div>
          ` : ''}
        `;

        const btnPickup = popupContent.querySelector('#map-pop-pickup') as HTMLButtonElement | null;
        const btnDest = popupContent.querySelector('#map-pop-dest') as HTMLButtonElement | null;
        const btnLocate = popupContent.querySelector('#map-pop-locate') as HTMLButtonElement | null;

        if (btnPickup) {
          btnPickup.onclick = () => {
            onPickupChangeRef.current?.({ lat, lng });
            map.closePopup();
          };
        }
        if (btnDest) {
          btnDest.onclick = () => {
            onDestinationChangeRef.current?.({ lat, lng });
            map.closePopup();
          };
        }
        if (btnLocate) {
          btnLocate.onclick = () => {
            onLocateUserRef.current?.();
            map.closePopup();
          };
        }

        const popup = L.popup({
          offset: [0, -10],
          closeButton: true,
          className: 'custom-interactive-popup',
        })
          .setLatLng([lat, lng])
          .setContent(popupContent)
          .openOn(map);

        clickPopupRef.current = popup;
      }
    });

    mapInstanceRef.current = map;
    setMapReady((r: number) => r + 1);

    // Invalidate size to guarantee zero blank spaces on initial render or resize
    const invalidate = () => {
      if (mapInstanceRef.current && (mapInstanceRef.current as any)._container) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {}
      }
    };

    const timer1 = setTimeout(invalidate, 100);
    const timer2 = setTimeout(invalidate, 400);

    const resizeObserver = new ResizeObserver(() => {
      invalidate();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      if (container && container._leaflet_id) {
        delete container._leaflet_id;
      }
      tileLayerRef.current = null;
      markersRef.current = {};
    };
  }, []);

  // Update Markers, Route and Map Bounds
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Ensure tile layer is attached to map
    if (tileLayerRef.current && !map.hasLayer(tileLayerRef.current)) {
      tileLayerRef.current.addTo(map);
    }

    // 1. Current Location Marker
    if (currentLocation?.lat && currentLocation?.lng) {
      if (markersRef.current.currentLoc && map.hasLayer(markersRef.current.currentLoc)) {
        markersRef.current.currentLoc.setLatLng([currentLocation.lat, currentLocation.lng]);
      } else {
        markersRef.current.currentLoc = L.marker([currentLocation.lat, currentLocation.lng], {
          icon: createCurrentLocationIcon(),
          zIndexOffset: 50,
        }).addTo(map);
      }
    } else if (markersRef.current.currentLoc) {
      map.removeLayer(markersRef.current.currentLoc);
      delete markersRef.current.currentLoc;
    }

    // 2. Pickup Marker (DRAGGABLE)
    if (pickup?.lat && pickup?.lng) {
      if (markersRef.current.pickup && map.hasLayer(markersRef.current.pickup)) {
        markersRef.current.pickup.setLatLng([pickup.lat, pickup.lng]);
      } else {
        const marker = L.marker([pickup.lat, pickup.lng], {
          icon: createPinIcon('#10b981', 'Pickup', Boolean(onPickupChangeRef.current), '🟢'),
          draggable: Boolean(onPickupChangeRef.current),
          zIndexOffset: 200,
        }).addTo(map);

        if (onPickupChangeRef.current) {
          marker.on('dragend', (e: any) => {
            const pos = e.target.getLatLng();
            onPickupChangeRef.current?.({ lat: pos.lat, lng: pos.lng });
          });
        }

        markersRef.current.pickup = marker;
      }

      if (pickup.address) {
        markersRef.current.pickup.bindPopup(
          `<div style="font-size:12px; font-weight:700; color:#0f172a;">📍 <b>Pickup Point:</b><br/><span style="font-weight:500; color:#475569;">${pickup.address}</span><br/><span style="color:#059669; font-size:10px; font-weight:700;">✨ Drag marker to adjust location</span></div>`
        );
      }
    } else if (markersRef.current.pickup) {
      map.removeLayer(markersRef.current.pickup);
      delete markersRef.current.pickup;
    }

    // 3. Destination Marker (DRAGGABLE)
    if (destination?.lat && destination?.lng) {
      if (markersRef.current.dest && map.hasLayer(markersRef.current.dest)) {
        markersRef.current.dest.setLatLng([destination.lat, destination.lng]);
      } else {
        const marker = L.marker([destination.lat, destination.lng], {
          icon: createPinIcon('#ef4444', 'Destination', Boolean(onDestinationChangeRef.current), '🔴'),
          draggable: Boolean(onDestinationChangeRef.current),
          zIndexOffset: 200,
        }).addTo(map);

        if (onDestinationChangeRef.current) {
          marker.on('dragend', (e: any) => {
            const pos = e.target.getLatLng();
            onDestinationChangeRef.current?.({ lat: pos.lat, lng: pos.lng });
          });
        }

        markersRef.current.dest = marker;
      }

      if (destination.address) {
        markersRef.current.dest.bindPopup(
          `<div style="font-size:12px; font-weight:700; color:#0f172a;">🏁 <b>Destination:</b><br/><span style="font-weight:500; color:#475569;">${destination.address}</span><br/><span style="color:#dc2626; font-size:10px; font-weight:700;">✨ Drag marker to adjust location</span></div>`
        );
      }
    } else if (markersRef.current.dest) {
      map.removeLayer(markersRef.current.dest);
      delete markersRef.current.dest;
    }

    // 4. Captain Marker
    if (captainLocation?.lat && captainLocation?.lng) {
      if (markersRef.current.captain && map.hasLayer(markersRef.current.captain)) {
        markersRef.current.captain.setLatLng([captainLocation.lat, captainLocation.lng]);
      } else {
        markersRef.current.captain = L.marker([captainLocation.lat, captainLocation.lng], {
          icon: createCaptainIcon(),
          zIndexOffset: 300,
        }).addTo(map);
      }
    } else if (markersRef.current.captain) {
      map.removeLayer(markersRef.current.captain);
      delete markersRef.current.captain;
    }

    // 5. Draw Next-Level Highlighted Road Path (Triple-Layer: Casing + Neon Glow + Flow Animation)
    if (
      pickup?.lat &&
      pickup?.lng &&
      destination?.lat &&
      destination?.lng &&
      !isNaN(pickup.lat) &&
      !isNaN(pickup.lng) &&
      !isNaN(destination.lat) &&
      !isNaN(destination.lng)
    ) {
      // Validate every coordinate pair to guarantee valid numeric arrays
      const rawPts =
        routeGeometry && Array.isArray(routeGeometry) && routeGeometry.length > 0
          ? routeGeometry
          : [
              [pickup.lat, pickup.lng],
              [destination.lat, destination.lng],
            ];

      const validPts = rawPts.filter(
        (p): p is [number, number] =>
          Array.isArray(p) &&
          p.length >= 2 &&
          typeof p[0] === 'number' &&
          !isNaN(p[0]) &&
          typeof p[1] === 'number' &&
          !isNaN(p[1])
      );

      const pts: [number, number][] =
        validPts.length >= 2
          ? validPts
          : [
              [pickup.lat, pickup.lng],
              [destination.lat, destination.lng],
            ];

      // Layer A: Dark Casing & Shadow
      if (markersRef.current.routeCasing && map.hasLayer(markersRef.current.routeCasing)) {
        markersRef.current.routeCasing.setLatLngs(pts);
      } else {
        markersRef.current.routeCasing = L.polyline(pts, {
          color: '#090d16',
          weight: 12,
          opacity: 0.7,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'leaflet-route-casing',
        }).addTo(map);
      }

      // Layer B: Vibrant Neon Highlight Path
      if (markersRef.current.routeHighlight && map.hasLayer(markersRef.current.routeHighlight)) {
        markersRef.current.routeHighlight.setLatLngs(pts);
      } else {
        markersRef.current.routeHighlight = L.polyline(pts, {
          color: '#0284c7',
          weight: 7,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'leaflet-route-highlight',
        }).addTo(map);
      }

      // Layer C: Flowing Inner Dashed Direction Line (Animated travel direction)
      if (markersRef.current.routeFlow && map.hasLayer(markersRef.current.routeFlow)) {
        markersRef.current.routeFlow.setLatLngs(pts);
      } else {
        markersRef.current.routeFlow = L.polyline(pts, {
          color: '#7dd3fc',
          weight: 3.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '10, 16',
          className: 'leaflet-route-flow',
        }).addTo(map);
      }

      // Start & Finish Badges along route ends
      const startPt = pts[0];
      const finishPt = pts[pts.length - 1];

      if (startPt && Array.isArray(startPt) && typeof startPt[0] === 'number') {
        if (markersRef.current.startBadge && map.hasLayer(markersRef.current.startBadge)) {
          markersRef.current.startBadge.setLatLng(startPt);
        } else {
          markersRef.current.startBadge = L.marker(startPt, {
            icon: createWayBadgeIcon('START 🟢', '#10b981', '#ffffff'),
            zIndexOffset: 150,
            interactive: false,
          }).addTo(map);
        }
      }

      if (finishPt && Array.isArray(finishPt) && typeof finishPt[0] === 'number') {
        if (markersRef.current.finishBadge && map.hasLayer(markersRef.current.finishBadge)) {
          markersRef.current.finishBadge.setLatLng(finishPt);
        } else {
          markersRef.current.finishBadge = L.marker(finishPt, {
            icon: createWayBadgeIcon('FINISH 🏁', '#ef4444', '#ffffff'),
            zIndexOffset: 150,
            interactive: false,
          }).addTo(map);
        }
      }

      // Smoothly zoom and fit both markers and entire highlighted road path in view
      try {
        const bounds = L.latLngBounds(pts);
        bounds.extend([pickup.lat, pickup.lng]);
        bounds.extend([destination.lat, destination.lng]);
        if (
          captainLocation?.lat &&
          captainLocation?.lng &&
          !isNaN(captainLocation.lat) &&
          !isNaN(captainLocation.lng)
        ) {
          bounds.extend([captainLocation.lat, captainLocation.lng]);
        }

        if (bounds.isValid() && (map as any)._container) {
          const size = map.getSize();
          if (size.x > 0 && size.y > 0) {
            map.fitBounds(bounds, {
              padding: [60, 60],
              maxZoom: 16,
              animate: true,
            });
          }
        }
      } catch (err) {
        console.warn('Map fitBounds failed:', err);
      }
    } else {
      // Clean up polylines if points are cleared
      if (markersRef.current.routeCasing) {
        map.removeLayer(markersRef.current.routeCasing);
        delete markersRef.current.routeCasing;
      }
      if (markersRef.current.routeHighlight) {
        map.removeLayer(markersRef.current.routeHighlight);
        delete markersRef.current.routeHighlight;
      }
      if (markersRef.current.routeFlow) {
        map.removeLayer(markersRef.current.routeFlow);
        delete markersRef.current.routeFlow;
      }
      if (markersRef.current.startBadge) {
        map.removeLayer(markersRef.current.startBadge);
        delete markersRef.current.startBadge;
      }
      if (markersRef.current.finishBadge) {
        map.removeLayer(markersRef.current.finishBadge);
        delete markersRef.current.finishBadge;
      }

      try {
        if (pickup?.lat && pickup?.lng && !isNaN(pickup.lat) && !isNaN(pickup.lng)) {
          map.setView([pickup.lat, pickup.lng], 14, { animate: true });
        } else if (
          destination?.lat &&
          destination?.lng &&
          !isNaN(destination.lat) &&
          !isNaN(destination.lng)
        ) {
          map.setView([destination.lat, destination.lng], 14, { animate: true });
        }
      } catch (err) {
        console.warn('Map setView failed:', err);
      }
    }

    // Invalidate size to guarantee tiles draw smoothly
    const t = setTimeout(() => {
      if (mapInstanceRef.current && (mapInstanceRef.current as any)._container) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {}
      }
    }, 100);
    return () => clearTimeout(t);
  }, [mapReady, pickup, destination, captainLocation, currentLocation, routeGeometry]);

  // Handle crosshair cursor and auto-pan for selectionMode without wiping out Leaflet DOM classes
  useEffect(() => {
    const container = mapContainerRef.current;
    const map = mapInstanceRef.current;
    if (!container || !map) return;

    if (selectionMode) {
      container.classList.add('leaflet-crosshair-mode');
      if (selectionMode === 'pickup' && pickup?.lat && pickup?.lng && !isNaN(pickup.lat) && !isNaN(pickup.lng)) {
        map.panTo([pickup.lat, pickup.lng], { animate: true });
      } else if (selectionMode === 'destination' && destination?.lat && destination?.lng && !isNaN(destination.lat) && !isNaN(destination.lng)) {
        map.panTo([destination.lat, destination.lng], { animate: true });
      }
    } else {
      container.classList.remove('leaflet-crosshair-mode');
    }

    const t = setTimeout(() => {
      if (mapInstanceRef.current && (mapInstanceRef.current as any)._container) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {}
      }
    }, 50);
    return () => clearTimeout(t);
  }, [selectionMode, pickup?.lat, pickup?.lng, destination?.lat, destination?.lng]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map || !(map as any)._container) return;
    try {
      if (
        pickup?.lat &&
        destination?.lat &&
        !isNaN(pickup.lat) &&
        !isNaN(pickup.lng) &&
        !isNaN(destination.lat) &&
        !isNaN(destination.lng)
      ) {
        const bounds = L.latLngBounds([
          [pickup.lat, pickup.lng],
          [destination.lat, destination.lng],
        ]);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      } else if (pickup?.lat && !isNaN(pickup.lat) && !isNaN(pickup.lng)) {
        map.setView([pickup.lat, pickup.lng], 14);
      }
    } catch (err) {
      console.warn('handleRecenter failed:', err);
    }
  };

  return (
    <div className={`relative w-full h-full min-h-[300px] overflow-hidden ${className}`}>
      <div
        ref={mapContainerRef}
        style={{ minHeight: '300px', height: '100%', width: '100%' }}
        className="leaflet-map-canvas w-full h-full"
      />

      {/* Floating Selection Mode Active Banner */}
      {selectionMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[400] bg-slate-900/95 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 border border-slate-700 animate-bounce">
          <span className={`w-2.5 h-2.5 rounded-full animate-ping ${selectionMode === 'pickup' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          Click anywhere on map to pin {selectionMode === 'pickup' ? '🟢 Pickup Location' : '🔴 Drop-off Location'}
          <button
            type="button"
            onClick={() => onSelectionModeChange?.(null)}
            className="ml-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded-md text-[10px]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Top Quick Pinning Bar for Passenger */}
      {showPinControls && (onPickupChange || onDestinationChange) && !selectionMode && (
        <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-1.5">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-2">
            Pin on Map:
          </span>
          {onPickupChange && (
            <button
              type="button"
              onClick={() => onSelectionModeChange?.('pickup')}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 transition-all active:scale-95 border border-emerald-200"
              title="Click map to pin pickup point"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Pickup</span>
            </button>
          )}
          {onDestinationChange && (
            <button
              type="button"
              onClick={() => onSelectionModeChange?.('destination')}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 flex items-center gap-1.5 transition-all active:scale-95 border border-red-200"
              title="Click map to pin drop-off point"
            >
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Drop-off</span>
            </button>
          )}
          {onLocateUser && (
            <button
              type="button"
              onClick={onLocateUser}
              disabled={isLocating}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 flex items-center gap-1.5 transition-all active:scale-95 border border-sky-200 disabled:opacity-50"
              title="Set current GPS position as pickup"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
              ) : (
                <Crosshair className="w-3.5 h-3.5 text-sky-600" />
              )}
              <span>Current Location</span>
            </button>
          )}
        </div>
      )}

      {/* Bottom Floating Control Buttons */}
      <div className="absolute bottom-5 right-5 z-[400] flex flex-col gap-2">
        {onLocateUser && (
          <button
            type="button"
            onClick={onLocateUser}
            disabled={isLocating}
            title="Locate my GPS position"
            aria-label="Locate my GPS position"
            className="bg-white hover:bg-slate-50 text-slate-800 hover:text-brand-600 p-2.5 rounded-2xl shadow-xl border border-slate-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
            ) : (
              <Crosshair className="w-4 h-4" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Route"
          aria-label="Recenter Route"
          className="bg-white hover:bg-slate-50 text-slate-800 hover:text-brand-600 p-2.5 rounded-2xl shadow-xl border border-slate-200 transition-all hover:scale-105 active:scale-95"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic Highlight Path Indicator Badge */}
      {pickup?.lat && destination?.lat && (
        <div className="absolute bottom-5 left-5 z-[400] bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-xl border border-slate-700/80 text-[11px] font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span className="text-sky-300">
            {routeDistanceKm ? `${routeDistanceKm} km` : 'Highlighted'} Travel Path
          </span>
          {routeDurationMins && (
            <span className="text-slate-400 font-normal">&bull; ~{routeDurationMins}m</span>
          )}
          <span className="text-[10px] text-emerald-400 font-medium hidden sm:inline ml-1 border-l border-slate-700 pl-2">
            Click map or drag pins to adjust
          </span>
        </div>
      )}
    </div>
  );
};
