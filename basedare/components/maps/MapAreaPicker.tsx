"use client";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Globe2,
  LocateFixed,
  Search,
  MapPin,
  X,
} from "lucide-react";
import type { MapArea } from "@/lib/map-entry";

type AreaResult = {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
};
export default function MapAreaPicker({
  label,
  approximate,
  locating,
  locationMessage,
  onLocate,
  onSelect,
}: {
  label: string;
  approximate: boolean;
  locating: boolean;
  locationMessage: string | null;
  onLocate: () => void;
  onSelect: (area: MapArea) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AreaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const details = useRef<HTMLDetailsElement>(null);
  const controller = useRef<AbortController | null>(null);
  const version = useRef(0);
  useEffect(
    () => () => {
      version.current += 1;
      controller.current?.abort();
    },
    []
  );
  async function search(city = query) {
    if (city.trim().length < 2) {
      setMessage("Enter a city or area name.");
      return;
    }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const current = ++version.current;
    setLoading(true);
    setMessage("");
    setResults([]);
    try {
      const response = await fetch(
        `/api/places/search?scope=area&q=${encodeURIComponent(city.trim())}`,
        {
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(7000)]),
          cache: "no-store",
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success)
        throw Error(
          response.status === 429
            ? "Give it a moment, then search again."
            : "City search couldn’t load. Try again or use your location."
        );
      if (current === version.current) {
        setResults(data.data.results);
        if (!data.data.results.length)
          setMessage("No matching areas. Try the city and country together.");
      }
    } catch (error) {
      if (current === version.current && !request.signal.aborted)
        setMessage(
          error instanceof Error && error.name !== "TimeoutError"
            ? error.message
            : "City search took too long. Try again."
        );
    } finally {
      if (current === version.current) setLoading(false);
    }
  }
  function close() {
    if (details.current) {
      details.current.open = false;
      details.current.querySelector("summary")?.focus();
    }
  }
  return (
    <details
      ref={details}
      className="map-area-picker relative mb-1"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-1 text-sm text-white/75">
        <Globe2
          size={16}
          className="shrink-0 text-cyan-200"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate">
          {label}{" "}
          <span className="ml-2 text-xs text-white/45">
            {approximate ? "Approximate area" : "Exploring"}
          </span>
        </span>
        <span className="shrink-0 text-xs font-bold text-cyan-100">
          Change city
        </span>
        <ChevronDown size={14} className="shrink-0" aria-hidden="true" />
      </summary>
      <div className="map-area-picker-panel bd-surface absolute left-0 top-full z-50 mt-2 max-h-[55dvh] w-[min(450px,calc(100vw-3.5rem))] overflow-y-auto p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-white">Where to next?</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close city picker"
            className="bd-action !h-11 !w-11 !p-0"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-white/60">
          Explore any city. Local plans, rewards and BaseDare places appear as
          people add them.
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <label className="bd-field flex min-w-0 flex-1 items-center gap-2 px-3">
            <Search
              size={16}
              className="shrink-0 text-cyan-200"
              aria-hidden="true"
            />
            <span className="sr-only">Search a city</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                version.current += 1;
                controller.current?.abort();
                setLoading(false);
                setResults([]);
                setMessage("");
              }}
              placeholder="City or area, country"
              className="min-w-0 w-full bg-transparent py-3 text-sm text-white outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bd-action !px-3 !text-xs"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {["London", "Tokyo", "New York", "Sydney", "Singapore", "Manila"].map(
            (city) => (
              <button
                type="button"
                key={city}
                disabled={loading}
                onClick={() => {
                  setQuery(city);
                  void search(city);
                }}
                className="min-h-11 rounded-full border border-white/10 px-3 text-xs text-white/65 hover:bg-white/5 focus-visible:outline focus-visible:outline-cyan-200"
              >
                {city}
              </button>
            )
          )}
        </div>
        {message ? (
          <p role="status" className="mt-3 text-sm leading-6 text-amber-100">
            {message}
          </p>
        ) : null}
        {results.length ? (
          <ul className="mt-3 space-y-2" aria-label="Matching cities">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => {
                    version.current += 1;
                    controller.current?.abort();
                    onSelect({
                      lat: result.latitude,
                      lng: result.longitude,
                      label: result.name,
                    });
                    if (details.current) details.current.open = false;
                  }}
                  className="bd-well flex min-h-14 w-full items-start gap-3 p-3 text-left"
                >
                  <MapPin
                    size={16}
                    className="mt-1 shrink-0 text-cyan-200"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">
                      {result.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-white/55">
                      {result.displayName}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          disabled={locating}
          onClick={onLocate}
          className="bd-action mt-4 w-full !text-xs"
        >
          <LocateFixed size={15} aria-hidden="true" />
          {locating ? "Finding your location…" : "Use my location"}
        </button>
        {locationMessage ? (
          <p role="status" className="mt-2 text-xs leading-5 text-amber-100">
            {locationMessage}
          </p>
        ) : null}
        <p className="mt-3 text-[11px] leading-5 text-white/45">
          City search:{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            © OpenStreetMap contributors
          </a>
          . Choosing a city never verifies your presence there.
        </p>
      </div>
    </details>
  );
}
