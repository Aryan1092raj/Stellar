'use client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import type { LeafletMouseEvent } from 'leaflet';
import { listDonations, Donation } from '../lib/api/client';
import 'leaflet/dist/leaflet.css';
import { useMapEvents } from 'react-leaflet';

export default function Map({ onSelect }: { onSelect?: (latlng: { lat: number; lng: number }) => void }) {
  const [donations, setDonations] = useState<Donation[]>([]);
  
  function ClickCapture() {
    useMapEvents({
      click(e: LeafletMouseEvent) {
        if (onSelect) onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  }

  function MapUpdater() {
    const map = useMap();
    useEffect(() => {
      setTimeout(() => map.invalidateSize(), 100);
    }, [map]);
    return null;
  }
  
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const list = await listDonations();
        if (active) setDonations(list);
      } catch (_) {}
    };
    load();
    const id = setInterval(load, 10000);
    return () => { active = false; clearInterval(id); };
  }, []);
  
  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} zoomControl={true}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapUpdater />
      <ClickCapture />
      {donations.filter(d => typeof d.donor_lat === 'number' && typeof d.donor_lng === 'number').map(d => (
        <Marker key={d.id} position={[d.donor_lat, d.donor_lng]}>
          <Popup>
            <div style={{ fontSize: 12, lineHeight: '1.6' }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: '#0066FF' }}>Donation #{d.id}</div>
              <div><strong>Amount:</strong> {d.amount} XLM</div>
              <div><strong>Status:</strong> <span style={{ 
                color: d.status === 'completed' ? '#00C851' : d.status === 'pending' ? '#FFBB33' : '#94a3b8',
                fontWeight: 500 
              }}>{d.status}</span></div>
              <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>{new Date(d.created_at).toLocaleDateString()}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
