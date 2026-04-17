import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import { MeshPhongMaterial } from "three";
import { tonePalette } from "./planetCatalog";
import { countryByCca3, countryByCcn3 } from "./planetData";
import { useImpactTimeline } from "./useImpactTimeline";
import type {
  PlanetSimulation,
  RenderablePlanetCountry,
} from "./types";

interface PlanetGlobeProps {
  simulation: PlanetSimulation | null;
  selectedCountryCode3: string | null;
  hoveredCountryCode3: string | null;
  onHoverCountry?: (countryCode3: string | null) => void;
  onSelectCountry?: (countryCode3: string) => void;
  interactive?: boolean;
  className?: string;
}

type GlobeModule = typeof import("react-globe.gl").default;

function countryTooltip(
  name: string,
  status: string,
  detail: string,
  accentColor: string,
) {
  return `
    <div style="min-width: 180px; border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; background: rgba(7,15,24,0.92); padding: 12px 14px; color: white; backdrop-filter: blur(10px);">
      <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: ${accentColor}; margin-bottom: 8px;">${status}</div>
      <div style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">${name}</div>
      <div style="font-size: 12px; line-height: 1.45; color: rgba(255,255,255,0.78);">${detail}</div>
    </div>
  `;
}

export function PlanetGlobe({
  simulation,
  selectedCountryCode3,
  hoveredCountryCode3,
  onHoverCountry,
  onSelectCountry,
  interactive = true,
  className,
}: PlanetGlobeProps) {
  const { activeImpacts, activeArcs, activeRings } = useImpactTimeline(simulation);
  const [GlobeImpl, setGlobeImpl] = useState<GlobeModule | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderableCountries, setRenderableCountries] = useState<RenderablePlanetCountry[]>([]);
  const [size, setSize] = useState({ width: 960, height: 720 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<any>(null);

  useEffect(() => {
    if (import.meta.env.MODE === "test") {
      return;
    }

    let cancelled = false;

    Promise.all([
      import("react-globe.gl"),
      import("world-atlas/countries-110m.json"),
      import("topojson-client"),
    ])
      .then(([globeModule, topologyModule, topojsonClient]) => {
        if (cancelled) {
          return;
        }

        const topology = topologyModule.default as { objects: Record<string, unknown> };
        const countriesObject = topology.objects.countries as any;
        const borders = topojsonClient.feature(
          topology as any,
          countriesObject,
        ) as unknown as FeatureCollection<
          RenderablePlanetCountry["geometry"],
          { name: string }
        >;

        const nextCountries = borders.features.flatMap((feature) => {
          const metadata = countryByCcn3.get(String((feature as any).id).padStart(3, "0"));
          if (!metadata || !feature.geometry) {
            return [];
          }
          return [{ ...metadata, geometry: feature.geometry }];
        });

        setRenderableCountries(nextCountries);
        setGlobeImpl(() => globeModule.default);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setLoadError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const nextWidth = Math.max(320, Math.floor(entry.contentRect.width));
      const nextHeight = Math.max(420, Math.floor(entry.contentRect.height));
      setSize({ width: nextWidth, height: nextHeight });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const globeMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        color: "#08131d",
        emissive: "#06111a",
        emissiveIntensity: 0.6,
        shininess: 8,
        transparent: true,
        opacity: 0.94,
      }),
    [],
  );

  useEffect(() => () => globeMaterial.dispose(), [globeMaterial]);

  useEffect(() => {
    if (!globeRef.current) {
      return;
    }

    const controls = globeRef.current.controls?.();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controls.enablePan = false;
      controls.minDistance = 160;
      controls.maxDistance = 340;
    }
  }, [GlobeImpl]);

  useEffect(() => {
    if (!selectedCountryCode3 || !globeRef.current) {
      return;
    }

    const country = countryByCca3.get(selectedCountryCode3);
    if (!country) {
      return;
    }

    globeRef.current.pointOfView?.(
      {
        lat: country.lat,
        lng: country.lng,
        altitude: simulation ? 1.55 : 1.8,
      },
      1200,
    );
  }, [selectedCountryCode3, simulation?.id]);

  const impactMap = useMemo(
    () => new Map(activeImpacts.map((impact) => [impact.countryCode3, impact])),
    [activeImpacts],
  );

  const labelData = useMemo(() => {
    const activeLabelSet = new Set<string>();
    const labels = activeImpacts
      .slice()
      .sort((left, right) => Math.abs(right.score) - Math.abs(left.score))
      .slice(0, 8)
      .map((impact) => {
        activeLabelSet.add(impact.countryCode3);
        return impact;
      });

    if (selectedCountryCode3 && !activeLabelSet.has(selectedCountryCode3)) {
      const selectedCountry = countryByCca3.get(selectedCountryCode3);
      if (selectedCountry) {
        labels.unshift({
          id: `label-${selectedCountry.cca3}`,
          countryCode: selectedCountry.cca2,
          countryCode3: selectedCountry.cca3,
          countryName: selectedCountry.name,
          lat: selectedCountry.lat,
          lng: selectedCountry.lng,
          tone: "warning",
          score: 0.4,
          label: "Selected",
          detail: "Active selection",
          delayMs: 0,
        });
      }
    }

    return labels;
  }, [activeImpacts, selectedCountryCode3]);

  const GlobeView = GlobeImpl as any;

  if (import.meta.env.MODE === "test") {
    return (
      <div
        className={`planet-shell grid min-h-[480px] place-items-center rounded-[2rem] border border-white/10 ${className ?? ""}`}
        data-testid="planet-globe-fallback"
      >
        <div className="space-y-2 text-center text-white/80">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
            Test fallback
          </p>
          <p className="font-display text-3xl text-white">Planet renderer stub</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`planet-shell relative min-h-[480px] overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 ${className ?? ""}`}
      ref={containerRef}
    >
      {!GlobeImpl || renderableCountries.length === 0 || loadError ? (
        <div className="grid h-full min-h-[480px] place-items-center bg-[radial-gradient(circle_at_center,rgba(30,61,96,0.28),rgba(4,10,16,0.92))] px-8 text-center">
          <div className="max-w-md space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
              Planet renderer
            </p>
            <p className="font-display text-3xl text-white">
              {loadError ? "3D planet unavailable" : "Initializing 3D planet"}
            </p>
            <p className="text-sm text-white/68">
              {loadError
                ? "The globe module could not load in this environment."
                : "Loading country boundaries, atmosphere layers, and impact overlays."}
            </p>
          </div>
        </div>
      ) : (
        <GlobeView
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showAtmosphere
          atmosphereColor="#4bc9ff"
          atmosphereAltitude={0.18}
          polygonsData={renderableCountries}
          polygonGeoJsonGeometry="geometry"
          polygonCapColor={(country: RenderablePlanetCountry) => {
            const impact = impactMap.get(country.cca3);
            if (impact) {
              return tonePalette[impact.tone].softColor;
            }
            if (country.cca3 === selectedCountryCode3) {
              return "rgba(92, 210, 255, 0.36)";
            }
            if (country.cca3 === hoveredCountryCode3) {
              return "rgba(255, 255, 255, 0.18)";
            }
            return "rgba(20, 35, 53, 0.82)";
          }}
          polygonSideColor={(country: RenderablePlanetCountry) => {
            const impact = impactMap.get(country.cca3);
            if (impact) {
              return tonePalette[impact.tone].borderColor;
            }
            if (country.cca3 === selectedCountryCode3) {
              return "rgba(95, 214, 255, 0.55)";
            }
            return "rgba(111, 154, 194, 0.18)";
          }}
          polygonStrokeColor={(country: RenderablePlanetCountry) =>
            country.cca3 === selectedCountryCode3
              ? "rgba(112, 229, 255, 0.95)"
              : "rgba(168, 196, 228, 0.14)"
          }
          polygonAltitude={(country: RenderablePlanetCountry) => {
            const impact = impactMap.get(country.cca3);
            if (impact) {
              return 0.015 + Math.abs(impact.score) * 0.035;
            }
            if (country.cca3 === selectedCountryCode3) {
              return 0.024;
            }
            if (country.cca3 === hoveredCountryCode3) {
              return 0.015;
            }
            return 0.004;
          }}
          polygonsTransitionDuration={850}
          polygonLabel={(country: RenderablePlanetCountry) => {
            const impact = impactMap.get(country.cca3);
            if (impact) {
              return countryTooltip(
                country.name,
                tonePalette[impact.tone].label,
                impact.detail,
                tonePalette[impact.tone].color,
              );
            }
            return countryTooltip(
              country.name,
              country.cca3 === selectedCountryCode3 ? "Selected" : "Country",
              `${country.region} / ${country.subregion}`,
              country.cca3 === selectedCountryCode3 ? "#74ebff" : "#d6e4f0",
            );
          }}
          onPolygonHover={
            interactive && onHoverCountry
              ? (polygon: object | null) =>
                  onHoverCountry((polygon as RenderablePlanetCountry | null)?.cca3 ?? null)
              : undefined
          }
          onPolygonClick={
            interactive && onSelectCountry
              ? (polygon: object) =>
                  onSelectCountry((polygon as RenderablePlanetCountry).cca3)
              : undefined
          }
          arcsData={activeArcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={(arc: (typeof activeArcs)[number]) => [
            tonePalette[arc.tone].color,
            "rgba(255,255,255,0.08)",
          ]}
          arcAltitude={(arc: (typeof activeArcs)[number]) =>
            0.15 + (arc.delayMs % 900) / 4000
          }
          arcStroke={0.45}
          arcDashLength={0.55}
          arcDashGap={0.35}
          arcDashAnimateTime="dashTimeMs"
          arcLabel={(arc: (typeof activeArcs)[number]) =>
            countryTooltip(
              "Propagation line",
              "Cross-border spillover",
              arc.label,
              tonePalette[arc.tone].color,
            )
          }
          ringsData={activeRings}
          ringLat="lat"
          ringLng="lng"
          ringMaxRadius="maxRadius"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          ringColor={(ring: (typeof activeRings)[number]) => tonePalette[ring.tone].color}
          labelsData={labelData}
          labelLat="lat"
          labelLng="lng"
          labelText={(label: (typeof labelData)[number]) => label.countryName}
          labelSize={0.85}
          labelAltitude={0.04}
          labelColor={(label: (typeof labelData)[number]) => tonePalette[label.tone].color}
          labelDotRadius={0.26}
          labelIncludeDot
          labelsTransitionDuration={400}
          enablePointerInteraction={interactive}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />
    </div>
  );
}
