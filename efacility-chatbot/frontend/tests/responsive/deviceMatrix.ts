export interface ResponsiveDevice {
  name: string;
  os: 'iOS' | 'Android';
  year: number;
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
}

export const responsiveDevices: ResponsiveDevice[] = [
  { name: '2015 iPhone 6s', os: 'iOS', year: 2015, width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
  { name: '2015 Galaxy S6', os: 'Android', year: 2015, width: 360, height: 640, deviceScaleFactor: 3, isMobile: true },
  { name: '2016 iPhone SE', os: 'iOS', year: 2016, width: 320, height: 568, deviceScaleFactor: 2, isMobile: true },
  { name: '2016 Pixel', os: 'Android', year: 2016, width: 411, height: 731, deviceScaleFactor: 2.6, isMobile: true },
  { name: '2017 iPhone X', os: 'iOS', year: 2017, width: 375, height: 812, deviceScaleFactor: 3, isMobile: true },
  { name: '2017 Galaxy S8', os: 'Android', year: 2017, width: 360, height: 740, deviceScaleFactor: 4, isMobile: true },
  { name: '2018 iPhone XS Max', os: 'iOS', year: 2018, width: 414, height: 896, deviceScaleFactor: 3, isMobile: true },
  { name: '2018 Pixel 3', os: 'Android', year: 2018, width: 393, height: 786, deviceScaleFactor: 2.75, isMobile: true },
  { name: '2019 iPhone 11', os: 'iOS', year: 2019, width: 414, height: 896, deviceScaleFactor: 2, isMobile: true },
  { name: '2019 Pixel 4 XL', os: 'Android', year: 2019, width: 411, height: 869, deviceScaleFactor: 3.5, isMobile: true },
  { name: '2020 iPhone 12 mini', os: 'iOS', year: 2020, width: 360, height: 780, deviceScaleFactor: 3, isMobile: true },
  { name: '2020 Galaxy S20', os: 'Android', year: 2020, width: 360, height: 800, deviceScaleFactor: 4, isMobile: true },
  { name: '2021 iPhone 13', os: 'iOS', year: 2021, width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
  { name: '2021 Pixel 6', os: 'Android', year: 2021, width: 412, height: 915, deviceScaleFactor: 2.6, isMobile: true },
  { name: '2022 iPhone 14 Pro Max', os: 'iOS', year: 2022, width: 430, height: 932, deviceScaleFactor: 3, isMobile: true },
  { name: '2022 Galaxy S22', os: 'Android', year: 2022, width: 360, height: 780, deviceScaleFactor: 3, isMobile: true },
  { name: '2023 iPhone 15 Pro', os: 'iOS', year: 2023, width: 393, height: 852, deviceScaleFactor: 3, isMobile: true },
  { name: '2023 Pixel 8 Pro', os: 'Android', year: 2023, width: 448, height: 998, deviceScaleFactor: 3, isMobile: true },
  { name: '2024 iPhone 16 Pro Max', os: 'iOS', year: 2024, width: 440, height: 956, deviceScaleFactor: 3, isMobile: true },
  { name: '2024 Galaxy S24 Ultra', os: 'Android', year: 2024, width: 384, height: 832, deviceScaleFactor: 3.75, isMobile: true },
  { name: '2025 compact fold cover', os: 'Android', year: 2025, width: 344, height: 882, deviceScaleFactor: 3, isMobile: true },
  { name: '2025 iPad mini portrait', os: 'iOS', year: 2025, width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true },
  { name: '2026 large Android portrait', os: 'Android', year: 2026, width: 412, height: 915, deviceScaleFactor: 3, isMobile: true },
  { name: '2026 iPad Pro portrait', os: 'iOS', year: 2026, width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: true },
];
