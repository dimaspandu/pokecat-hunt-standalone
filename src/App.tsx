import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { useGameStore } from "~/stores/useGameStore";
import { initGA, trackPage, trackEvent } from "./analytics";
import StartHuntModal from "~/components/Fragments/StartHuntModal";
import Notification from "~/components/Notification";
import CollectionModal from "~/components/Fragments/CollectionModal";
import "./App.scss";

const MainScene = lazy(() => import("~/scenes/MainScene"));
const CatchScene = lazy(() => import("~/scenes/CatchScene"));
const CollectionScene = lazy(() => import("~/scenes/CollectionScene"));
const BackpackScene = lazy(() => import("~/scenes/BackpackScene"));
const StoreScene = lazy(() => import("~/scenes/StoreScene"));
const ScannerScene = lazy(() => import("~/scenes/ScannerScene"));
const CreatorScene = lazy(() => import("~/scenes/CreatorScene"));

/**
 * Root application component managing global modals, routes, and user initialization.
 */
export default function App() {
  const {
    notification,
    clearNotification,
    selectedPokecat,
    closeModal,
    setNotification,
    user,
    setUser
  } = useGameStore();
  const location = useLocation();

  const [showStartModal, setShowStartModal] = useState(false);

  // Initialize GA once
  useEffect(() => {
    initGA();
  }, []);

  // Track page view on route change
  useEffect(() => {
    trackPage(location.pathname + location.search);
    clearNotification();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  /**
   * Initialize user identity from localStorage or prompt for name on first visit.
   */
  useEffect(() => {
    if (user) return; // already initialized
    setShowStartModal(true);
  }, [user, setUser]);

  /** Handle submission from StartHuntModal to finalize user registration */
  const handleStartSubmit = (name: string) => {
    const generatedId = "user-" + Math.random().toString(36).slice(2, 9);
    const newUser = { id: generatedId, name };
    setUser(newUser);
    setShowStartModal(false);

    // Track user join event in GA
    trackEvent("User", "Join", name);
  };

  return (
    <div className="app-container">
      <Suspense
        fallback={
          <div className="app-container__loading">
            <div className="app-container__spinner" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<MainScene />} />
          <Route path="/catch/:id" element={<CatchScene />} />
          <Route path="/collection" element={<CollectionScene />} />
          <Route path="/backpack" element={<BackpackScene />} />
          <Route path="/store" element={<StoreScene />} />
          <Route path="/scanner" element={<ScannerScene />} />
          <Route path="/creator" element={<CreatorScene />} />
        </Routes>
      </Suspense>

      {showStartModal && <StartHuntModal onStart={handleStartSubmit} />}

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {selectedPokecat && <CollectionModal pokecat={selectedPokecat} onClose={closeModal} />}
    </div>
  );
}
