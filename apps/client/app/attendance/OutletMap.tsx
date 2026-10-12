'use client';

/**
 * Outlet map (#908): OpenStreetMap tiles through Leaflet, the outlet pin with its radius circle, an optional
 * scan point, and "pick on map" clicks. Leaflet touches `window`, so it loads inside an effect.
 */
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef } from 'react';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';

type Leaflet = typeof import('leaflet');

export interface LatLng {
  lat: number;
  lng: number;
}

/** Default view when an outlet has no coordinates yet: central Ho Chi Minh City. */
const FALLBACK: LatLng = { lat: 10.7769, lng: 106.7009 };

export default function OutletMap({
  center,
  radiusM,
  point,
  pointOk,
  picking,
  onPick,
  height = 240,
  label,
}: {
  center: LatLng | null;
  radiusM: number;
  point?: LatLng | null;
  pointOk?: boolean;
  picking?: boolean;
  onPick?: (p: LatLng) => void;
  height?: number;
  label?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const lib = useRef<Leaflet | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const pickRef = useRef({ picking, onPick });
  pickRef.current = { picking, onPick };
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    let alive = true;
    import('leaflet').then((mod) => {
      if (!alive || !el.current || map.current) return;
      const L = ((mod as unknown as { default?: Leaflet }).default || mod) as Leaflet;
      lib.current = L;
      const m = L.map(el.current, { scrollWheelZoom: false }).setView([FALLBACK.lat, FALLBACK.lng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      m.on('click', (e) => {
        const { picking: on, onPick: cb } = pickRef.current;
        if (on && cb) cb({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      map.current = m;
      setReady(true);
    });
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    const L = lib.current;
    const m = map.current;
    const g = layer.current;
    if (!ready || !L || !m || !g) return;
    g.clearLayers();
    const bounds: Array<[number, number]> = [];
    if (center) {
      const circle = L.circle([center.lat, center.lng], { radius: radiusM, color: '#1D4ED8', weight: 2, fillColor: '#1D4ED8', fillOpacity: 0.12 }).addTo(g);
      L.circleMarker([center.lat, center.lng], { radius: 7, color: '#fff', weight: 3, fillColor: '#1D4ED8', fillOpacity: 1 }).addTo(g);
      const b = circle.getBounds();
      bounds.push([b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]);
    }
    if (point) {
      L.circleMarker([point.lat, point.lng], { radius: 6, color: '#fff', weight: 2, fillColor: pointOk ? '#047857' : '#B91C1C', fillOpacity: 1 }).addTo(g);
      bounds.push([point.lat, point.lng]);
    }
    if (bounds.length > 0) m.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
    // The map may mount inside a dialog that just opened
    window.setTimeout(() => m.invalidateSize(), 0);
  }, [ready, center?.lat, center?.lng, radiusM, point?.lat, point?.lng, pointOk]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={el}
      role="img"
      aria-label={label}
      style={{ height, cursor: picking ? 'crosshair' : undefined }}
      className="relative z-0 w-full overflow-hidden rounded-xl border border-ar-line bg-ar-subtle"
    />
  );
}
