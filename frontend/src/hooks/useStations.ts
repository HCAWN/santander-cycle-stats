import { useState, useEffect } from "react";
import { StationsArraySchema, type Station } from "../schemas/station";

interface UseStationsResult {
  stations: Station[];
  loading: boolean;
  error: string | null;
}

const STATIONS_URL =
  "https://tfl.gov.uk/tfl/syndication/feeds/cycle-hire/livecyclehireupdates.xml";

export function useStations(): UseStationsResult {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStations() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(STATIONS_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch stations: ${response.statusText}`);
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        // Parse XML to extract stations
        const stationElements = xmlDoc.querySelectorAll("station");
        const parsedStations: Station[] = [];

        stationElements.forEach((stationEl) => {
          const getTextContent = (tagName: string): string => {
            const element = stationEl.querySelector(tagName);
            return element?.textContent?.trim() || "";
          };

          const getNumberContent = (tagName: string): number => {
            const text = getTextContent(tagName);
            return text ? parseFloat(text) : 0;
          };

          const getBooleanContent = (tagName: string): boolean => {
            const text = getTextContent(tagName);
            return text === "true";
          };

          const getNumberOrNull = (tagName: string): number | null => {
            const text = getTextContent(tagName);
            return text ? parseFloat(text) : null;
          };

          const station: Station = {
            id: getTextContent("id"),
            name: getTextContent("name"),
            terminalName: getTextContent("terminalName"),
            lat: getNumberContent("lat"),
            long: getNumberContent("long"),
            installed: getBooleanContent("installed"),
            locked: getBooleanContent("locked"),
            installDate: getNumberOrNull("installDate"),
            removalDate: getNumberOrNull("removalDate"),
            temporary: getBooleanContent("temporary"),
            nbBikes: getNumberContent("nbBikes"),
            nbStandardBikes: getNumberContent("nbStandardBikes"),
            nbEBikes: getNumberContent("nbEBikes"),
            nbEmptyDocks: getNumberContent("nbEmptyDocks"),
            nbDocks: getNumberContent("nbDocks"),
          };

          parsedStations.push(station);
        });

        // Validate with Zod
        const validatedStations = StationsArraySchema.parse(parsedStations);
        setStations(validatedStations);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch stations"
        );
        console.error("Error fetching stations:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStations();
  }, []);

  return { stations, loading, error };
}
