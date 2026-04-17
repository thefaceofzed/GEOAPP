import countries from "world-countries";
import type { Countries } from "world-countries";
import type { PlanetCountry } from "./types";

const countryMetadata = countries as Countries;

export const planetCountries: PlanetCountry[] = countryMetadata
  .map((country) => ({
    cca2: country.cca2,
    cca3: country.cca3,
    ccn3: country.ccn3 || country.cca3,
    name: country.name.common,
    officialName: country.name.official,
    region: country.region || "Other",
    subregion: country.subregion || country.region || "Other",
    lat: country.latlng[0] ?? 0,
    lng: country.latlng[1] ?? 0,
    flag: country.flag,
    capital: country.capital?.[0] ?? null,
    borders: country.borders ?? [],
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export const countryByCca3 = new Map(
  planetCountries.map((country) => [country.cca3, country]),
);

export const countryByCca2 = new Map(
  planetCountries.map((country) => [country.cca2, country]),
);

export const countryByCcn3 = new Map(
  planetCountries.map((country) => [country.ccn3, country]),
);

export const countrySearchIndex = planetCountries.map((country) => ({
  value: country.name,
  code2: country.cca2,
  code3: country.cca3,
  region: country.region,
}));

export function findCountryByCode(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toUpperCase();
  return (
    countryByCca2.get(normalized) ??
    countryByCca3.get(normalized) ??
    countryByCcn3.get(normalized) ??
    planetCountries.find((country) => country.name.toUpperCase() === normalized) ??
    planetCountries.find(
      (country) =>
        country.name.toUpperCase().startsWith(normalized) ||
        country.officialName.toUpperCase().startsWith(normalized),
    ) ??
    null
  );
}
