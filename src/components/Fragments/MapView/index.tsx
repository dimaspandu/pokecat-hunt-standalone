import "leaflet/dist/leaflet.css";
import { useGameStore } from "~/stores/useGameStore";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { type LatLngExpression } from "leaflet";
import { type Pokecat } from "~/types/Pokecat";
import { type LocalPokecat } from "~/types/LocalPokecat";
import L from "leaflet";
import FlyToUser from "../FlyToUser";
import styles from "./MapView.module.scss";

/**
 * Create a Leaflet icon from a Pokecat's sprite image.
 */
const createIcon = (url: string) =>
  L.icon({
    iconUrl: `${window.location.origin}${url}`,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });

/**
 * Generate random coordinates near a base location.
 * This is used to spawn Pokecats around the user.
 */
const randomNearby = (baseLat: number, baseLng: number, spread = 0.01) => {
  const lat = baseLat + (Math.random() - 0.5) * spread;
  const lng = baseLng + (Math.random() - 0.5) * spread;
  return { lat, lng };
};

export default function MapView() {
  const setNotification = useGameStore((s) => s.setNotification);
  const user = useGameStore((s) => s.user);
  const navigate = useNavigate();

  // State for currently visible Pokecats on the map
  const [wildCats, setWildCats] = useState<LocalPokecat[]>([]);

  // State for all Pokecats fetched from JSON (the pool for spawning)
  const [allCats, setAllCats] = useState<LocalPokecat[]>([]);

  // State for user's current position
  const [userPosition, setUserPosition] = useState<LatLngExpression | null>(
    null
  );

  // Default map center (Jakarta)
  const defaultCenter: LatLngExpression = [-6.2, 106.8];

  /**
   * Determine user position once on mount.
   * If geolocation is denied or unsupported, use default center with small random offset.
   */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserPosition([latitude, longitude]);
        },
        () => {
          const randomOffset = () => (Math.random() - 0.5) * 0.02;
          setUserPosition([-6.2 + randomOffset(), 106.8 + randomOffset()]);
        }
      );
    } else {
      setUserPosition(defaultCenter);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetch Pokecats from JSON once the user position is available.
   * This initializes the pool of all Pokecats, but does not show them on the map yet.
   */
  useEffect(() => {
    if (!userPosition) return;

    const fetchCats = async () => {
      try {
        const res = await fetch("/data/pokecats.json");
        const data: Pokecat[] = await res.json();

        const { lat: userLat, lng: userLng } = L.latLng(userPosition);

        // Generate the pool of Pokecats with random nearby coordinates
        const pool: LocalPokecat[] = data.map((cat) => {
          const { lat, lng } = randomNearby(userLat, userLng, 0.02);
          return {
            ...cat,
            lat,
            lng,
            originLat: lat,
            originLng: lng,
            direction: Math.random() * 360,
            fadingOut: false,
            status: "wild",
            expiresAt: Date.now() + 1000 * 60 * (1 + Math.random() * 2), // 1-3 minutes lifetime
          };
        });

        setAllCats(pool);
      } catch (err) {
        console.error("Failed to load Pokecats:", err);
        setNotification({ message: "Failed to load Pokecats", type: "error" });
      }
    };

    fetchCats();
  }, [userPosition, setNotification]);

  /**
   * Spawn interval: periodically add 1-2 Pokecats from the pool to the map.
   * This simulates Pokecats appearing gradually rather than all at once.
   */
  useEffect(() => {
    if (allCats.length === 0) return;

    const spawnInterval = setInterval(() => {
      setWildCats((prev) => {
        if (allCats.length === 0) return prev;

        const spawnCount = Math.floor(Math.random() * 2) + 1; // 1 or 2 cats per spawn
        const newCats: LocalPokecat[] = [];

        for (let i = 0; i < spawnCount && allCats.length > 0; i++) {
          const idx = Math.floor(Math.random() * allCats.length);
          newCats.push(allCats[idx]);
          allCats.splice(idx, 1); // remove spawned cat from pool
        }

        return [...prev, ...newCats];
      });
    }, 3000); // spawn every 3 seconds

    return () => clearInterval(spawnInterval);
  }, [allCats]);

  /**
   * Animate Pokecat movement and handle expiration.
   * Cats move slightly in a random direction every tick.
   * Cats that expire fade out and are removed from the map.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setWildCats((prev) =>
        prev
          .map((cat) => {
            if (cat.fadingOut) return cat;

            if (Date.now() > cat.expiresAt) return { ...cat, fadingOut: true };

            if (Math.random() < 0.05) cat.direction += (Math.random() - 0.5) * 60;

            const delta = 0.00005;
            const rad = (cat.direction * Math.PI) / 180;
            return {
              ...cat,
              lat: cat.lat + Math.sin(rad) * delta,
              lng: cat.lng + Math.cos(rad) * delta,
            };
          })
          .filter((cat) => !cat.fadingOut) // remove fading out cats
      );
    }, 60); // update ~16 times per second
    return () => clearInterval(interval);
  }, []);

  /**
   * Handle Pokecat capture by the user.
   * Marks the cat as fading out, removes it after 1 second, and navigates to the catch page.
   */
  const handleCatch = (pc: Pokecat) => {
    if (!user) return;
    setWildCats((prev) =>
      prev.map((cat) =>
        cat.id === pc.id ? { ...cat, fadingOut: true } : cat
      )
    );
    setTimeout(() => {
      setWildCats((prev) => prev.filter((cat) => cat.id !== pc.id));
      navigate(`/catch/${pc.id}`);
    }, 1000);
  };

  return (
    <MapContainer
      className={styles["map"]}
      center={userPosition ?? defaultCenter}
      zoom={15}
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userPosition && <FlyToUser position={userPosition} />}

      {wildCats.map((pc) => (
        <Marker
          key={pc.id}
          position={[pc.lat, pc.lng]}
          icon={createIcon(pc.iconUrl)}
        >
          <Popup className={styles["pokecat-popup"]}>
            <div
              className={`${styles["pokecat-popup__content"]} ${
                pc.fadingOut ? styles["pokecat-popup__content--fadeout"] : ""
              }`}
            >
              <img
                src={pc.iconUrl}
                alt={pc.name}
                className={`${styles["pokecat-popup__image"]} ${styles[`pokecat-popup__image--${pc.rarity}`]}`}
              />
              <h3 className={styles["pokecat-popup__title"]}>{pc.name}</h3>
              <button
                className={styles["pokecat-popup__button"]}
                onClick={() => handleCatch(pc)}
                disabled={pc.fadingOut}
              >
                Catch
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
