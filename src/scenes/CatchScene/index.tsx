import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Pokecat } from "~/types/Pokecat";
import type { GameItem } from "~/types/GameItem";
import type { ItemDefinition } from "~/types/ItemDefinition";
import { useGameStore } from "~/stores/useGameStore";
import { ITEMS } from "~/constants/items";
import AvailableItemsModal from "~/components/Fragments/AvailableItemsModal";
import styles from "./CatchScene.module.scss";

export default function CatchScene() {
  const { id } = useParams();
  const navigate = useNavigate();

  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);

  const latStr = searchParams.get("lat") ?? "0";
  const lngStr = searchParams.get("lng") ?? "0";

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  const { items, addCaught, removeItem, setNotification } = useGameStore();

  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<Pokecat | null>(null);
  const [throwing, setThrowing] = useState(false);
  const [result, setResult] = useState<"idle" | "success" | "fail">("idle");
  const [dodge, setDodge] = useState<"none" | "left" | "right">("none");
  const [showThrownItem, setShowThrownItem] = useState(false);
  const [ballHit, setBallHit] = useState(false);
  const [catMoving, setCatMoving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [throwCategory, setThrowCategory] = useState<"food" | "any">("food");
  const [selectedItem, setSelectedItem] = useState<ItemDefinition | null>(null);
  const [catSpeech, setCatSpeech] = useState<string | null>(null);

  // Cat speech bubbles
  useEffect(() => {
    const phrases = ["Miaw~", "Prrr~", "It's not Funny!", "Nyaa!", "Miiiaww!", "Meow-meow!", "Paw~"];
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const showSpeech = () => {
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      setCatSpeech(phrase);
      const duration = 1200 + Math.random() * 400;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setCatSpeech(null), duration);
    };

    showSpeech();
    const interval = setInterval(() => {
      if (Math.random() < 0.7) showSpeech();
    }, 1500);

    return () => {
      clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  // Fetch Pokecat detail from local JSON
  useEffect(() => {
    if (!id) return;
    const fetchCat = async () => {
      try {
        const res = await fetch("/data/pokecats.json");
        const allCats: Pokecat[] = await res.json();
        const found = allCats.find((c) => c.id === id);
        setCat(found ? {
          ...found,
          lat,
          lng,
          status: "caught",
          expiresAt: Date.now() + 1000 * 60 * (1 + Math.random() * 2)
        } : null);
      } catch (err) {
        console.error("Failed to load pokecats.json", err);
        setCat(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCat();
  }, [id, lat, lng]);

  // Random cat movement every 2.5s
  useEffect(() => {
    const interval = setInterval(() => {
      setCatMoving(true);
      setTimeout(() => setCatMoving(false), 1000);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Filter food items and other items
  const foodItems: (GameItem & ItemDefinition)[] = items
    .map((i) => {
      const def = ITEMS.find((it) => it.id === i.id && it.category === "food");
      if (!def) return null;
      return { ...def, quantity: i.quantity };
    })
    .filter((i): i is GameItem & ItemDefinition => !!i && i.quantity > 0);

  const anyItems: (GameItem & ItemDefinition)[] = items
    .map((i) => {
      const def = ITEMS.find((it) => it.id === i.id && it.category !== "food");
      if (!def) return null;
      return { ...def, quantity: i.quantity };
    })
    .filter((i): i is GameItem & ItemDefinition => !!i && i.quantity > 0);

  // Simulate throwing & catching result locally
  const throwItem = (item: GameItem & ItemDefinition) => {
    if (!cat || !item) return;
    setThrowing(true);
    setShowThrownItem(true);
    setBallHit(false);
    setModalOpen(false);
    setSelectedItem(item);

    const rate = item.catchRate ?? 0.7;

    setTimeout(() => {
      const dodged = Math.random() < 0.3;
      if (dodged) {
        setDodge(Math.random() < 0.5 ? "left" : "right");
        setResult("fail");
        setShowThrownItem(false);
        setNotification({
          message: `${cat.name} dodged your ${item.name}!`,
          type: "warning",
        });
        setTimeout(() => navigate("/"), 1800);
        return;
      }

      setBallHit(true);
      const success = Math.random() < rate;
      setResult(success ? "success" : "fail");

      setTimeout(() => {
        if (success) {
          addCaught({ ...cat, caughtAt: Date.now() });
          setNotification({ message: `You caught ${cat.name}!`, type: "success" });
        } else {
          setNotification({ message: `${cat.name} escaped!`, type: "error" });
        }
        setShowThrownItem(false);
        removeItem(item.id, 1);
        setTimeout(() => navigate("/"), 1800);
      }, 800);
    }, 800);
  };

  if (loading) return <div className={styles["catch-scene__loading"]}>LOADING...</div>;
  if (!cat) return <div className={styles["catch-scene__error"]}>Cat not found</div>;

  const Icon = selectedItem?.iconComponent;
  const noItems = items.length === 0;

  return (
    <div className={styles["catch-scene"]}>
      <h2 className={styles["catch-scene__title"]}>{cat.name} appeared!</h2>

      <div className={styles["catch-scene__stage"]}>
        <div className={styles["catch-scene__cat-wrapper"]}>
          <img
            src={cat.iconUrl}
            alt={cat.name}
            className={[
              styles["catch-scene__cat"],
              throwing ? styles["catch-scene__cat--shake"] : "",
              result === "success" ? styles["catch-scene__cat--caught"] : "",
              result === "fail" && dodge === "left" ? styles["catch-scene__cat--dodge-left"] : "",
              result === "fail" && dodge === "right" ? styles["catch-scene__cat--dodge-right"] : "",
              catMoving ? styles["catch-scene__cat--move-random"] : "",
            ].join(" ")}
          />

          {catSpeech && <div className={styles["catch-scene__speech"]}>{catSpeech}</div>}
        </div>

        {showThrownItem && Icon && (
          <div
            className={`${styles["catch-scene__thrown"]} ${
              ballHit ? styles["catch-scene__thrown--hit"] : styles["catch-scene__thrown--throw"]
            }`}
          >
            <Icon />
          </div>
        )}
      </div>

      {noItems && (
        <div className={styles["catch-scene__alert"]}>
          <p>You don’t have any items to catch Pokecats yet!</p>
          <button
            onClick={() => navigate("/store")}
            className={styles["catch-scene__alert-button"]}
          >
            Go to Store
          </button>
        </div>
      )}

      <div className={styles["catch-scene__controls"]}>
        <button
          onClick={() => {
            setThrowCategory("food");
            setModalOpen(true);
          }}
          className={styles["catch-scene__button"]}
          disabled={noItems || foodItems.length === 0}
        >
          Throw Food
        </button>

        <button
          onClick={() => {
            setThrowCategory("any");
            setModalOpen(true);
          }}
          className={[
            styles["catch-scene__button"],
            styles["catch-scene__button--technique"],
          ].join(" ")}
          disabled={noItems || anyItems.length === 0}
        >
          Use Technique
        </button>

        <button
          onClick={() => navigate("/")}
          className={[
            styles["catch-scene__button"],
            styles["catch-scene__button--run"],
          ].join(" ")}
        >
          Run Away
        </button>
      </div>

      {modalOpen && (
        <AvailableItemsModal
          items={throwCategory === "food" ? foodItems : anyItems}
          onUse={throwItem}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
