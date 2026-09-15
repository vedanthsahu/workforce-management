import { Country } from "country-state-city";

export const TIMEZONES = [
  "Asia/Kolkata",
  ...Intl.supportedValuesOf("timeZone"),
].filter((value, index, self) => self.indexOf(value) === index).sort();

export const COUNTRIES = Country.getAllCountries()
  .map((c) => c.name)
  .sort();
