import { City, Country, State } from "country-state-city";

export const TIMEZONES = [
  "Asia/Kolkata",
  ...Intl.supportedValuesOf("timeZone"),
].filter((value, index, self) => self.indexOf(value) === index).sort();

export const COUNTRIES = Country.getAllCountries()
  .map((c) => c.name)
  .sort();

const uniqueSorted = (values: string[]) => [...new Set(values)].sort();

// Short forms older offices were saved with before the Country dropdown
// existed (e.g. "USA"), mapped to their ISO code.
const COUNTRY_ALIASES: Record<string, string> = {
  USA: "US",
  "U.S.A.": "US",
  "UNITED STATES OF AMERICA": "US",
  UK: "GB",
  "U.K.": "GB",
  UAE: "AE",
};

// The backend stores country/city as display names, so the cascading
// dropdowns look up ISO codes from those names on demand. Also accepts an
// ISO code or a known short form, for offices saved as free text.
const countryIsoFromName = (countryName: string) => {
  const trimmed = countryName.trim();
  const upper = trimmed.toUpperCase();
  if (COUNTRY_ALIASES[upper]) return COUNTRY_ALIASES[upper];
  return Country.getAllCountries().find(
    (c) => c.name.toUpperCase() === upper || c.isoCode === upper
  )?.isoCode;
};

export const getStatesOfCountry = (countryName: string): string[] => {
  const countryIso = countryIsoFromName(countryName);
  if (!countryIso) return [];
  return uniqueSorted(State.getStatesOfCountry(countryIso).map((s) => s.name));
};

// Countries without subdivisions in the dataset fall back to every city in
// the country so City is still selectable when State has nothing to pick.
export const getCities = (countryName: string, stateName: string): string[] => {
  const countryIso = countryIsoFromName(countryName);
  if (!countryIso) return [];

  if (!stateName) {
    return State.getStatesOfCountry(countryIso).length === 0
      ? uniqueSorted((City.getCitiesOfCountry(countryIso) ?? []).map((c) => c.name))
      : [];
  }

  const stateIso = State.getStatesOfCountry(countryIso).find((s) => s.name === stateName)?.isoCode;
  if (!stateIso) return [];
  return uniqueSorted(City.getCitiesOfState(countryIso, stateIso).map((c) => c.name));
};

// State isn't stored on the site record, so editing an existing office
// recovers it from the saved city. Returns "" if the city isn't in the
// dataset (e.g. typed by hand) or the name is ambiguous across states.
export const findStateOfCity = (countryName: string, cityName: string): string => {
  const countryIso = countryIsoFromName(countryName);
  if (!countryIso || !cityName) return "";
  const stateCodes = new Set(
    (City.getCitiesOfCountry(countryIso) ?? [])
      .filter((c) => c.name === cityName)
      .map((c) => c.stateCode)
  );
  if (stateCodes.size !== 1) return "";
  const [stateCode] = stateCodes;
  return State.getStateByCodeAndCountry(stateCode, countryIso)?.name ?? "";
};
