import assert from "node:assert/strict";
import test from "node:test";

import { DREAMERS_HUB_COORDINATES, distanceMetres, googleMapsUrl, parseDrivingRoute, parseVenueCoordinates } from "../src/lib/venue/location";

test("uses the destination pin from the organiser's link, not the Google camera centre", () => {
  assert.deepEqual(DREAMERS_HUB_COORDINATES, [3.83631, 7.370485]);
  const url = new URL(googleMapsUrl("Dreamers Hub", DREAMERS_HUB_COORDINATES));
  assert.equal(url.searchParams.get("destination"), "7.370485,3.83631");
  assert.equal(url.searchParams.has("origin"), false);
});

test("missing or invalid coordinates cannot create a venue destination", () => {
  for (const [lat, lng] of [[undefined, undefined], ["", ""], [" ", "3"], ["7", undefined], ["abc", "3"], ["86", "3"], ["7", "181"], ["Infinity", "3"]]) {
    assert.equal(parseVenueCoordinates(lat, lng), null);
  }
  assert.deepEqual(parseVenueCoordinates("7.370485", "3.83631"), DREAMERS_HUB_COORDINATES);
  assert.deepEqual(parseVenueCoordinates("0", "0"), [0, 0]);
  const url = new URL(googleMapsUrl("The Dreamers Hub, Ibadan", null));
  assert.equal(url.pathname, "/maps/search/");
  assert.equal(url.searchParams.get("query"), "The Dreamers Hub, Ibadan");
  assert.equal(url.searchParams.has("destination"), false);
});

test("movement distance handles stationary positions and known separations", () => {
  assert.equal(distanceMetres(DREAMERS_HUB_COORDINATES, DREAMERS_HUB_COORDINATES), 0);
  assert.ok(Math.abs(distanceMetres([0, 0], [0, 1]) - 111_195) < 1);
  assert.ok(Number.isFinite(distanceMetres([0, 0], [180, 0])));
});

test("only valid road-route responses can draw a route or claim a journey time", () => {
  const route = { distance: 843, duration: 122, geometry: { type: "LineString", coordinates: [[3.84, 7.37], [3.83631, 7.370485]] } };
  assert.deepEqual(parseDrivingRoute({ code: "Ok", routes: [route] }), route);
  for (const response of [null, {}, { code: "NoRoute", routes: [] }, { code: "Ok", routes: [] },
    { code: "Ok", routes: [{ ...route, distance: -1 }] },
    { code: "Ok", routes: [{ ...route, duration: "122" }] },
    { code: "Ok", routes: [{ ...route, geometry: { type: "LineString", coordinates: [[NaN, 7], [3, 7]] } }] },
    { code: "Ok", routes: [{ ...route, geometry: { type: "LineString", coordinates: [[3, 7]] } }] }]) {
    assert.equal(parseDrivingRoute(response), null);
  }
});
