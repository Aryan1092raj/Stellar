"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import type { LeafletMouseEvent } from "leaflet";
import { listDonations, Donation } from "../lib/api/client";
import "leaflet/dist/leaflet.css";
import { useMapEvents } from "react-leaflet";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const TILE_CONFIG = MAPBOX_TOKEN
  ? {
      url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
      attribution: "&copy; Mapbox &copy; OpenStreetMap",
    }
  : {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
    };

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
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%", zIndex: 1 }}
      zoomControl={true}
    >
      <TileLayer url={TILE_CONFIG.url} attribution={TILE_CONFIG.attribution} />
      <MapUpdater />
      <ClickCapture />
      {donations
        .filter((d) => typeof d.donor_lat === "number" && typeof d.donor_lng === "number")
        .map((d) => (
          <Marker key={d.id} position={[d.donor_lat, d.donor_lng]}>
            <Popup>
              <div className="font-sans text-xs p-1 space-y-1.5 leading-relaxed">
                <div className="font-bold text-primary text-sm">Donation #{d.id}</div>
                <div>
                  <strong>Amount:</strong>{" "}
                  <span className="font-mono font-semibold">{d.amount} XLM</span>
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`font-semibold capitalize ${
                      d.status === "completed"
                        ? "text-semantic-up"
                        : d.status === "pending"
                        ? "text-amber-500"
                        : "text-muted"
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="text-[10px] text-muted pt-1 border-t border-hairline-soft">
                  {new Date(d.created_at).toLocaleDateString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
