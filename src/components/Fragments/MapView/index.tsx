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
  const navigate = useNavigate();

  /** Currently visible Pokecats on the map */
  const [wildCats, setWildCats] = useState<LocalPokecat[]>([]);

  /** Current spawn pool (cats that can appear) */
  const [allCats, setAllCats] = useState<LocalPokecat[]>([]);

  /** Original full pool for respawning when current pool is empty */
  const [allCatsOriginal, setAllCatsOriginal] = useState<LocalPokecat[]>([]);

  /** User's current location */
  const [userPosition, setUserPosition] = useState<LatLngExpression | null>(null);

  /** Default map center (Jakarta) */
  const defaultCenter: LatLngExpression = [-6.2, 106.8];

  /**
   * Determine user position on mount.
   * If geolocation is denied, fallback to default center with small random offset.
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
   * Fetch Pokecats from JSON and initialize both current pool and original pool.
   */
  useEffect(() => {
    if (!userPosition) return;

    const fetchCats = async () => {
      try {
        const res = await fetch("/data/pokecats.json");
        const data: Pokecat[] = await res.json();

        const { lat: userLat, lng: userLng } = L.latLng(userPosition);

        // Generate initial pool with random nearby positions
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

        setAllCats(pool);          // set current spawn pool
        setAllCatsOriginal(pool);  // save a copy for respawn
      } catch (err) {
        console.error("Failed to load Pokecats:", err);
        setNotification({ message: "Failed to load Pokecats", type: "error" });
      }
    };

    fetchCats();
  }, [userPosition, setNotification]);

  /**
   * Spawn interval: periodically add 1-2 Pokecats from the pool to the map.
   * If the pool is empty, reset it from the original full pool.
   */
  useEffect(() => {
    if (allCatsOriginal.length === 0) return;

    const spawnInterval = setInterval(() => {
      setWildCats((prev) => {
        // Make a local copy of the current pool
        let pool = [...allCats];

        // Reset pool if empty
        if (pool.length === 0) {
          pool = allCatsOriginal.map((c) => ({ ...c }));
        }

        const spawnCount = Math.floor(Math.random() * 2) + 1; // 1-2 cats
        const newCats: LocalPokecat[] = [];

        for (let i = 0; i < spawnCount && pool.length > 0; i++) {
          const idx = Math.floor(Math.random() * pool.length);
          newCats.push(pool[idx]);
          pool.splice(idx, 1);
        }

        setAllCats(pool); // update current pool
        return [...prev, ...newCats]; // add new cats to map
      });
    }, 3000);

    return () => clearInterval(spawnInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCatsOriginal]);

  /**
   * Animate Pokecat movement and handle expiration.
   * Cats move slightly in a random direction every tick.
   * Cats sometimes stop for 1-4 seconds, then continue moving.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setWildCats((prev) =>
        prev
          .map((cat) => {
            if (cat.fadingOut) return cat;

            // Expire cats that reach their lifetime
            if (Date.now() > cat.expiresAt) return { ...cat, fadingOut: true };

            // Initialize movement toggle
            if (cat.isMoving === undefined) cat.isMoving = Math.random() < 0.5;
            if (!cat.nextToggle) cat.nextToggle = Date.now() + 1000 + Math.random() * 3000;

            // Toggle moving/stopped state after 1-4s
            if (Date.now() > cat.nextToggle) {
              cat.isMoving = !cat.isMoving;
              cat.nextToggle = Date.now() + 1000 + Math.random() * 3000;
            }

            if (cat.isMoving) {
              // Small random direction changes
              if (Math.random() < 0.05) cat.direction += (Math.random() - 0.5) * 60;
              const delta = 0.00005;
              const rad = (cat.direction * Math.PI) / 180;
              return {
                ...cat,
                lat: cat.lat + Math.sin(rad) * delta,
                lng: cat.lng + Math.cos(rad) * delta,
                isMoving: cat.isMoving,
                nextToggle: cat.nextToggle,
              };
            }

            return { ...cat, isMoving: cat.isMoving, nextToggle: cat.nextToggle };
          })
          .filter((cat) => !cat.fadingOut) // remove expired cats
      );
    }, 60); // ~16fps

    return () => clearInterval(interval);
  }, []);

  /**
   * Handle Pokecat capture by the user.
   * Marks the cat as fading out, removes it after 1 second, and navigates to the catch page.
   */
  const handleCatch = (pc: Pokecat) => {
    setWildCats((prev) =>
      prev.map((cat) => (cat.id === pc.id ? { ...cat, fadingOut: true } : cat))
    );
    setTimeout(() => {
      setWildCats((prev) => prev.filter((cat) => cat.id !== pc.id));
      navigate(`/catch/${pc.id}?lat=${pc.lat}&lng=${pc.lng}`);
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

      {wildCats.map((pc, idx) => (
        <Marker
          key={[pc.id, idx].join("-")}
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
