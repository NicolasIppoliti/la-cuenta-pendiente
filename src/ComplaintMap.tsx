import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

export type Point = { longitude: number; latitude: number };

type ComplaintMapProps = {
  onSelect: (point: Point) => void;
};

const initialCenter: [number, number] = [-62.078, -38.875];

function canUseOsmTiles(hostname: string) {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

export function ComplaintMap({ onSelect }: ComplaintMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [geolocationHint, setGeolocationHint] = useState("");
  const [hasCandidate, setHasCandidate] = useState(false);
  const localTilesEnabled = canUseOsmTiles(window.location.hostname);

  useEffect(() => {
    if (!container.current) return;

    const map = new maplibregl.Map({
      container: container.current,
      center: initialCenter,
      zoom: 11,
      style: {
        version: 8,
        sources: localTilesEnabled
          ? {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors",
              },
            }
          : {},
        layers: localTilesEnabled ? [{ id: "osm", type: "raster", source: "osm" }] : [],
      },
    });
    let active = true;
    let marker: maplibregl.Marker | undefined;

    const selectPoint = ({ lngLat }: maplibregl.MapMouseEvent) => {
      if (marker) {
        marker.setLngLat(lngLat);
      } else {
        marker = new maplibregl.Marker().setLngLat(lngLat).addTo(map);
      }
      setHasCandidate(true);
      onSelect({ longitude: lngLat.lng, latitude: lngLat.lat });
    };
    map.on("click", selectPoint);

    if (!navigator.geolocation) {
      setGeolocationHint("La ubicación del navegador no está disponible.");
    } else {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (active) map.flyTo({ center: [coords.longitude, coords.latitude], zoom: 14 });
        },
        () => {
          if (active) setGeolocationHint("La ubicación del navegador no está disponible.");
        },
        { timeout: 5000 },
      );
    }

    return () => {
      active = false;
      map.off("click", selectPoint);
      map.remove();
    };
  }, [localTilesEnabled, onSelect]);

  return (
    <section aria-label="Seleccioná el punto del reclamo">
      <div className="complaint-map" ref={container} />
      {geolocationHint ? <p className="mt-3 text-sm">{geolocationHint}</p> : null}
      {hasCandidate ? <p className="mt-3">Punto candidato seleccionado.</p> : null}
      {!localTilesEnabled ? (
        <p className="mt-3 text-sm">El mapa local no está disponible aquí.</p>
      ) : null}
    </section>
  );
}
