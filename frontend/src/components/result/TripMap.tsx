import { useEffect, useMemo, useState } from "react";
import {
  DirectionsRenderer,
  GoogleMap,
  useJsApiLoader,
} from "@react-google-maps/api";
import type { DayPlan, RouteConnection } from "../../types";

type MapTravelMode = "walking" | "driving" | "transit" | "bicycling";
type RouteStatus = {
  state: "pending" | "ok" | "failed";
  status?: string;
};
type RouteStatuses = Record<number, RouteStatus>;

const travelModeOptions: Array<{ label: string; value: MapTravelMode }> = [
  { label: "Walk", value: "walking" },
  { label: "Drive", value: "driving" },
  { label: "Transit", value: "transit" },
  { label: "Bike", value: "bicycling" },
];

export function TripMap({
  days,
  routes,
}: {
  days: DayPlan[];
  routes: RouteConnection[];
}) {
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
    | string
    | undefined;

  const legacyEmbedApiKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY as
    | string
    | undefined;
  const routesByDay = useMemo(
    () => groupRoutesByDay(routes, days.length),
    [routes, days.length],
  );
  const firstDayWithRoutes = routesByDay.findIndex(
    (dayRoutes) => dayRoutes.length > 0,
  );
  const [activeMapDay, setActiveMapDay] = useState(
    firstDayWithRoutes >= 0 ? firstDayWithRoutes : 0,
  );
  const [editableRoutesByDay, setEditableRoutesByDay] = useState(routesByDay);
  const [travelMode, setTravelMode] = useState<MapTravelMode>(() =>
    getMapTravelMode(
      routesByDay[firstDayWithRoutes]?.[0]?.transportation ?? "",
    ),
  );
  const [routeStatuses, setRouteStatuses] = useState<RouteStatuses>({});
  const activeRoutes = editableRoutesByDay[activeMapDay] ?? [];
  const mapCenter = useMemo(() => getMapCenter(days), [days]);
  const activeRouteKey = useMemo(
    () =>
      JSON.stringify({
        activeMapDay,
        travelMode,
        routes: activeRoutes.map((route) => ({
          from: route.from,
          to: route.to,
        })),
      }),
    [activeMapDay, activeRoutes, travelMode],
  );

  useEffect(() => {
    setEditableRoutesByDay(routesByDay);
    setActiveMapDay(firstDayWithRoutes >= 0 ? firstDayWithRoutes : 0);
    setTravelMode(
      getMapTravelMode(
        routesByDay[firstDayWithRoutes]?.[0]?.transportation ?? "",
      ),
    );
  }, [routesByDay, firstDayWithRoutes]);

  useEffect(() => {
    setRouteStatuses({});
  }, [activeRouteKey]);

  const updateRoute = (
    routeIndex: number,
    field: "from" | "to",
    value: string,
  ) => {
    setEditableRoutesByDay((current) =>
      current.map((dayRoutes, dayIndex) =>
        dayIndex === activeMapDay
          ? dayRoutes.map((route, index) =>
              index === routeIndex ? { ...route, [field]: value } : route,
            )
          : dayRoutes,
      ),
    );
  };

  const swapRoute = (routeIndex: number) => {
    setEditableRoutesByDay((current) =>
      current.map((dayRoutes, dayIndex) =>
        dayIndex === activeMapDay
          ? dayRoutes.map((route, index) =>
              index === routeIndex
                ? { ...route, from: route.to, to: route.from }
                : route,
            )
          : dayRoutes,
      ),
    );
  };

  return (
    <div className="map-section">
      <div className="map-day-tabs" role="tablist" aria-label="Map day">
        {days.map((day, index) => (
          <button
            key={day.date}
            type="button"
            className={activeMapDay === index ? "active" : ""}
            onClick={() => setActiveMapDay(index)}
          >
            Day {index + 1}
          </button>
        ))}
      </div>

      <div className="map-controls">
        <span>Travel mode</span>
        <div className="map-mode-options">
          {travelModeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={travelMode === option.value ? "active" : ""}
              onClick={() => setTravelMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!mapsApiKey ? (
        <div className="map-empty">
          <strong>Google Maps API key missing</strong>
          <span>
            {legacyEmbedApiKey
              ? "VITE_GOOGLE_MAPS_EMBED_API_KEY is set, but this map now needs VITE_GOOGLE_MAPS_API_KEY with Maps JavaScript API and Directions API enabled."
              : "Set VITE_GOOGLE_MAPS_API_KEY in the frontend env to render the map."}
          </span>
        </div>
      ) : activeRoutes.length === 0 ? (
        <div className="map-empty">
          <strong>No route data for this day</strong>
          <span>
            The planner needs to return route connections before the map can be
            rendered.
          </span>
        </div>
      ) : (
        <GoogleDirectionsMap
          apiKey={mapsApiKey}
          center={mapCenter}
          day={days[activeMapDay]}
          routes={activeRoutes}
          travelMode={travelMode}
          onRouteStatusesChange={setRouteStatuses}
        />
      )}

      <RouteConnections routes={activeRoutes} dayIndex={activeMapDay} />
      <RouteEditor
        routes={activeRoutes}
        routeStatuses={routeStatuses}
        onSwap={swapRoute}
        onUpdate={updateRoute}
      />
    </div>
  );
}

function GoogleDirectionsMap({
  apiKey,
  center,
  day,
  routes,
  travelMode,
  onRouteStatusesChange,
}: {
  apiKey: string;
  center: google.maps.LatLngLiteral;
  day: DayPlan | undefined;
  routes: RouteConnection[];
  travelMode: MapTravelMode;
  onRouteStatusesChange: (routeStatuses: RouteStatuses) => void;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "trip-planner-google-map",
    googleMapsApiKey: apiKey,
  });
  const [directionSegments, setDirectionSegments] = useState<
    Array<{ key: string; result: google.maps.DirectionsResult }>
  >([]);
  const [routeFailures, setRouteFailures] = useState<
    Array<{ key: string; status: string }>
  >([]);
  const [isRouting, setIsRouting] = useState(false);
  const directionRequests = useMemo(
    () => (isLoaded ? buildDirectionRequests(routes, travelMode, day) : []),
    [day, isLoaded, routes, travelMode],
  );
  const directionsKey = useMemo(
    () =>
      JSON.stringify({
        routes: routes.map((route) => ({
          from: route.from,
          to: route.to,
        })),
        travelMode,
        day: day?.date,
      }),
    [day?.date, routes, travelMode],
  );

  useEffect(() => {
    setDirectionSegments([]);
    setRouteFailures([]);
    setIsRouting(false);
    onRouteStatusesChange({});
  }, [directionsKey, onRouteStatusesChange]);

  useEffect(() => {
    if (!isLoaded) return;
    if (directionRequests.length === 0) {
      const missingStatuses = Object.fromEntries(
        routes.map((_, index) => [
          index,
          {
            state: "failed",
            status: "MISSING_ORIGIN_OR_DESTINATION",
          } satisfies RouteStatus,
        ]),
      );
      setDirectionSegments([]);
      setRouteFailures([
        {
          key: "missing",
          status: "MISSING_ORIGIN_OR_DESTINATION",
        },
      ]);
      onRouteStatusesChange(missingStatuses);
      return;
    }

    let isCurrent = true;
    const directionsService = new google.maps.DirectionsService();
    setIsRouting(true);
    onRouteStatusesChange(
      Object.fromEntries(
        directionRequests.map((request) => [
          request.routeIndex,
          { state: "pending" } satisfies RouteStatus,
        ]),
      ),
    );

    void Promise.all(
      directionRequests.map((segment) =>
        routeSegment(directionsService, segment),
      ),
    ).then((results) => {
      if (!isCurrent) return;

      const successfulSegments: Array<{
        key: string;
        result: google.maps.DirectionsResult;
      }> = [];
      const failedSegments: Array<{ key: string; status: string }> = [];

      results.forEach(({ key, result, status }) => {
        if (result) {
          successfulSegments.push({ key, result });
          return;
        }

        failedSegments.push({ key, status });
      });

      setDirectionSegments(successfulSegments);
      setRouteFailures(failedSegments);
      onRouteStatusesChange(
        Object.fromEntries(
          results.map(({ routeIndex, result, status }) => [
            routeIndex,
            result
              ? ({ state: "ok", status } satisfies RouteStatus)
              : ({ state: "failed", status } satisfies RouteStatus),
          ]),
        ),
      );
      setIsRouting(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [directionRequests, isLoaded, onRouteStatusesChange, routes]);

  if (loadError) {
    return (
      <div className="map-empty">
        <strong>Google Maps failed to load</strong>
        <span>
          Check the frontend Google Maps API key and browser restrictions.
        </span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="map-empty">
        <strong>Loading Google Map</strong>
        <span>Preparing the directions map for this day.</span>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="directions-map"
      center={center}
      zoom={12}
      options={{
        clickableIcons: true,
        fullscreenControl: true,
        mapTypeControl: false,
        streetViewControl: false,
      }}
    >
      {directionSegments.map((segment) => (
        <DirectionsRenderer
          key={segment.key}
          options={{
            directions: segment.result,
            suppressMarkers: false,
            preserveViewport: false,
          }}
        />
      ))}
      {isRouting && (
        <div className="map-route-status">
          <strong>Calculating route</strong>
          <span>Google Maps is checking each route leg.</span>
        </div>
      )}
      {!isRouting && routeFailures.length > 0 && (
        <div className="map-route-status">
          <strong>
            {directionSegments.length > 0
              ? `Some route legs unavailable: ${routeFailures[0].status}`
              : `Route unavailable: ${routeFailures[0].status}`}
          </strong>
          <span>{getDirectionsStatusMessage(routeFailures[0].status)}</span>
        </div>
      )}
    </GoogleMap>
  );
}

function RouteConnections({
  routes,
  dayIndex,
}: {
  routes: RouteConnection[];
  dayIndex: number;
}) {
  if (routes.length === 0) {
    return (
      <div className="route-empty">
        Google route connections will appear here when the planner returns them.
      </div>
    );
  }

  return (
    <div className="route-connections">
      {routes.map((route, index) => (
        <article
          className="route-card"
          key={`${route.day_index}-${route.from}-${route.to}-${index}`}
        >
          <div className="route-card-header">
            <span>Day {dayIndex + 1}</span>
            {route.map_url ? (
              <a href={route.map_url} target="_blank" rel="noreferrer">
                Open map
              </a>
            ) : null}
          </div>
          <strong>
            {route.from} → {route.to}
          </strong>
          <div className="route-meta">
            {route.transportation ? <span>{route.transportation}</span> : null}
            {route.distance_text ? <span>{route.distance_text}</span> : null}
            {route.duration_text ? <span>{route.duration_text}</span> : null}
          </div>
          {route.notes ? <p>{route.notes}</p> : null}
        </article>
      ))}
    </div>
  );
}

function RouteEditor({
  routes,
  routeStatuses,
  onSwap,
  onUpdate,
}: {
  routes: RouteConnection[];
  routeStatuses: RouteStatuses;
  onSwap: (routeIndex: number) => void;
  onUpdate: (routeIndex: number, field: "from" | "to", value: string) => void;
}) {
  if (routes.length === 0) return null;

  return (
    <div className="route-editor">
      <div className="route-editor-title">Edit Route Stops</div>
      {routes.map((route, index) => {
        const routeStatus = routeStatuses[index];
        const isFailed = routeStatus?.state === "failed";

        return (
          <div
            className={`route-edit-row ${isFailed ? "route-edit-row-error" : ""}`}
            key={`${route.day_index}-${route.from}-${route.to}-${index}`}
          >
            {isFailed && (
              <div className="route-edit-status" role="status">
                <span className="route-status-icon" aria-hidden="true">
                  ×
                </span>
                <span>
                  Not shown on map:{" "}
                  {getDirectionsStatusLabel(routeStatus.status)}
                </span>
              </div>
            )}
            <label>
              <span>From</span>
              <input
                value={route.from}
                onChange={(event) =>
                  onUpdate(index, "from", event.target.value)
                }
              />
            </label>
            <button
              className="swap-route-button"
              type="button"
              onClick={() => onSwap(index)}
            >
              Swap
            </button>
            <label>
              <span>To</span>
              <input
                value={route.to}
                onChange={(event) => onUpdate(index, "to", event.target.value)}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}

function groupRoutesByDay(
  routes: RouteConnection[],
  dayCount: number,
): RouteConnection[][] {
  const grouped = Array.from(
    { length: dayCount },
    () => [] as RouteConnection[],
  );

  routes.forEach((route) => {
    const normalizedDayIndex =
      route.day_index > 0 && route.day_index <= dayCount
        ? route.day_index - 1
        : route.day_index;

    if (grouped[normalizedDayIndex]) {
      grouped[normalizedDayIndex].push(route);
    }
  });

  return grouped;
}

type DirectionSegmentRequest = {
  key: string;
  routeIndex: number;
  request: google.maps.DirectionsRequest;
};

function buildDirectionRequests(
  routes: RouteConnection[],
  travelMode: MapTravelMode,
  day: DayPlan | undefined,
): DirectionSegmentRequest[] {
  return routes.flatMap((route, index) => {
    const origin = resolveRouteStop(route.from, day);
    const destination = resolveRouteStop(route.to, day);

    if (!origin || !destination) return [];

    return {
      key: `${index}-${route.from}-${route.to}-${travelMode}`,
      routeIndex: index,
      request: {
        origin,
        destination,
        travelMode: getGoogleTravelMode(travelMode),
      },
    };
  });
}

function routeSegment(
  directionsService: google.maps.DirectionsService,
  segment: DirectionSegmentRequest,
): Promise<{
  key: string;
  routeIndex: number;
  result: google.maps.DirectionsResult | null;
  status: string;
}> {
  return new Promise((resolve) => {
    directionsService.route(segment.request, (result, status) => {
      resolve({
        key: segment.key,
        routeIndex: segment.routeIndex,
        result:
          status === google.maps.DirectionsStatus.OK && result ? result : null,
        status,
      });
    });
  });
}

function resolveRouteStop(
  stop: string,
  day: DayPlan | undefined,
): string | google.maps.LatLngLiteral {
  const cleanedStop = stop.trim();
  if (!cleanedStop || !day) return cleanedStop;

  const hotelMatch = matchRoutePlace(cleanedStop, day.hotel);
  if (hotelMatch) return hotelMatch;

  for (const attraction of day.attractions) {
    const attractionMatch = matchRoutePlace(cleanedStop, attraction);
    if (attractionMatch) return attractionMatch;
  }

  return cleanedStop;
}

function matchRoutePlace(
  stop: string,
  place:
    | DayPlan["hotel"]
    | DayPlan["attractions"][number]
    | undefined,
): string | google.maps.LatLngLiteral | undefined {
  if (!place?.name) return undefined;

  const normalizedStop = normalizePlaceName(stop);
  const normalizedName = normalizePlaceName(place.name);
  const isMatch =
    normalizedStop.includes(normalizedName) ||
    normalizedName.includes(normalizedStop);

  if (!isMatch) return undefined;

  if (place.location?.latitude && place.location?.longitude) {
    return {
      lat: place.location.latitude,
      lng: place.location.longitude,
    };
  }

  if (place.address) return `${place.name}, ${place.address}`;

  return place.name;
}

function normalizePlaceName(value: string): string {
  return value.toLocaleLowerCase().replace(/[\s,，、。.-]/g, "");
}

function getMapTravelMode(transportation: string): MapTravelMode {
  const value = transportation.toLowerCase();
  if (value.includes("walk")) return "walking";
  if (value.includes("bike") || value.includes("bicycl")) return "bicycling";
  if (
    value.includes("transit") ||
    value.includes("metro") ||
    value.includes("train") ||
    value.includes("bus") ||
    value.includes("mrt")
  ) {
    return "transit";
  }
  if (value.includes("drive") || value.includes("car")) return "driving";
  return "walking";
}

function getGoogleTravelMode(
  travelMode: MapTravelMode,
): google.maps.TravelMode {
  const travelModes = google.maps.TravelMode;

  if (travelMode === "driving") return travelModes.DRIVING;
  if (travelMode === "transit") return travelModes.TRANSIT;
  if (travelMode === "bicycling") return travelModes.BICYCLING;
  return travelModes.WALKING;
}

function getDirectionsStatusMessage(status: string): string {
  if (status === "REQUEST_DENIED") {
    return "Enable Directions API for VITE_GOOGLE_MAPS_API_KEY, add it to this key's API restrictions, and confirm billing/referrer settings.";
  }
  if (status === "ZERO_RESULTS") {
    return "Google could not find a route for the selected stops and travel mode. Try Drive, Transit, or edit the stop names.";
  }
  if (status === "OVER_QUERY_LIMIT") {
    return "The Google Directions quota was exceeded. Wait, raise quota, or use another key.";
  }
  if (status === "NOT_FOUND") {
    return "One of the route stops could not be geocoded. Edit the From/To fields with a fuller address.";
  }
  if (status === "MISSING_ORIGIN_OR_DESTINATION") {
    return "Add both a From and To stop before routing.";
  }
  return "Google rejected this route request. Try another travel mode or edit the stop names.";
}

function getDirectionsStatusLabel(status?: string): string {
  if (!status) return "not available";
  if (status === "ZERO_RESULTS") return "no route found";
  if (status === "NOT_FOUND") return "stop not found";
  if (status === "REQUEST_DENIED") return "API request denied";
  if (status === "OVER_QUERY_LIMIT") return "quota exceeded";
  if (status === "MISSING_ORIGIN_OR_DESTINATION") {
    return "missing From or To stop";
  }
  return status;
}

function getMapCenter(days: DayPlan[]): google.maps.LatLngLiteral {
  for (const day of days) {
    for (const attraction of day.attractions) {
      if (attraction.location?.latitude && attraction.location?.longitude) {
        return {
          lat: attraction.location.latitude,
          lng: attraction.location.longitude,
        };
      }
    }
  }

  return { lat: 35.6762, lng: 139.6503 };
}
