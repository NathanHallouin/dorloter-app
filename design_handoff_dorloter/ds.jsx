/* ===========================================================================
   DORLOTER · Design system partagé (ds.jsx)
   Icônes lucide · primitives · données démo · Navbar / BottomNav / Footer
   Fidèle au repo : palette coral/lavande/sable/prune, Geist, ton chaleureux.
   =========================================================================== */
const { useState, useEffect, useRef, useMemo } = React;

/* --------------------------- Icônes lucide -------------------------------- */
const LUCIDE = {
  paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  radio: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  stethoscope: '<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  cat: '<path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>',
  dog: '<path d="M11.25 16.25h1.5L12 17z"/><path d="M16 14v.5"/><path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309"/><path d="M8 14v.5"/><path d="M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"/>',
  baby: '<path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M17.5 8a8 8 0 0 1-11 0"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  shieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  badgeCheck: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  syringe: '<path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
  phone: '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  menu: '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  mars: '<path d="M16 3h5v5"/><path d="m21 3-6.75 6.75"/><circle cx="10" cy="14" r="6"/>',
  venus: '<path d="M12 15v7"/><path d="M9 19h6"/><circle cx="12" cy="9" r="6"/>',
  ruler: '<path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  marker: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  euro: '<path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  logout: '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  trending: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  percent: '<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  trees: '<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  paperclip: '<path d="M13.234 20.252 21 12.3"/><path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486l6.929-6.758"/>',
  scanSearch: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="m16 16-1.9-1.9"/>',
  briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  microscope: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/>',
};

function Icon({ name, size = 20, stroke = 2, fill = 'none', className, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: LUCIDE[name] || '' }} />
  );
}

/* ----------------------- Marque (paw coral + dorloter) -------------------- */
function Logo({ onClick, size = 'md', light }) {
  const fs = size === 'lg' ? 26 : size === 'sm' ? 16 : 19;
  const is = size === 'lg' ? 26 : size === 'sm' ? 17 : 20;
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
      border: 'none', background: 'transparent', cursor: 'pointer', padding: 2 }}>
      <span style={{ color: light ? '#fff' : 'var(--coral-500)', display: 'inline-flex' }}>
        <Icon name="paw" size={is} stroke={2.2} />
      </span>
      <span style={{ fontSize: fs + 1, fontWeight: 700, letterSpacing: '-.02em',
        color: light ? '#fff' : 'var(--foreground)' }} className="brandword">dorloter</span>
    </button>
  );
}

/* ------------------------------ Primitives -------------------------------- */
function Eyebrow({ children, tone = 'coral' }) {
  return (
    <p className="mono" style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.18em',
      color: `var(--${tone}-600)`, display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 18, height: 1.5, background: `var(--${tone}-500)` }} />
      {children}
    </p>
  );
}

/* Filet éditorial (hairline, avec libellé optionnel) */
function Rule({ label, tone = 'sable', style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...style }}>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {label && <span className="mono" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '.16em', color: 'var(--muted-fg)', whiteSpace: 'nowrap' }}>{label}</span>}
      {label && <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />}
    </div>
  );
}

/* Bandeau défilant (fanzine) · identité forte */
function Marquee({ items, tone = 'coral' }) {
  const sep = '\u2003\u2726\u2003';
  const seq = items.join(sep) + sep;
  return (
    <div className="ident-only" style={{ overflow: 'hidden', background: `var(--${tone}-500)`, color: '#fff',
      borderTop: '2px solid rgba(255,255,255,.18)', borderBottom: '2px solid rgba(255,255,255,.18)' }}>
      <div style={{ display: 'inline-flex', whiteSpace: 'nowrap', animation: 'dlMarquee 30s linear infinite' }}>
        {[0, 1].map(k => (
          <span key={k} className="mono" style={{ padding: '11px 0', fontSize: 13.5, fontWeight: 600,
            letterSpacing: '.06em', textTransform: 'uppercase' }}>{seq}</span>
        ))}
      </div>
    </div>
  );
}

/* Tampon / sticker rotatif */
function Stamp({ children, tone = 'prune', rotate = -9, style }) {
  return (
    <span className="ident-only mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '9px 14px', borderRadius: 999, background: `var(--${tone}-700)`, color: 'var(--lavande-200)',
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em',
      transform: `rotate(${rotate}deg)`, boxShadow: '0 8px 22px rgba(20,16,8,.3)',
      border: '1.5px solid var(--lavande-400)', animation: 'dlStampIn .4s ease both', ...style }}>
      {children}
    </span>
  );
}

function Pill({ children, tone = 'sable', icon, style }) {
  const tones = {
    coral: { bg: 'var(--coral-50)', fg: 'var(--coral-700)', bd: 'var(--coral-300)' },
    lavande: { bg: 'var(--lavande-50)', fg: 'var(--lavande-700)', bd: 'var(--lavande-300)' },
    prune: { bg: 'var(--prune-50)', fg: 'var(--prune-700)', bd: 'var(--prune-300)' },
    green: { bg: 'var(--coral-50)', fg: 'var(--coral-700)', bd: 'var(--coral-300)' },
    brick: { bg: 'var(--brick-50)', fg: 'var(--brick-700)', bd: 'var(--brick-300)' },
    rose: { bg: 'var(--brick-50)', fg: 'var(--brick-700)', bd: 'var(--brick-300)' },
    sable: { bg: 'transparent', fg: 'var(--muted-fg)', bd: 'var(--border)' },
    white: { bg: 'rgba(251,248,241,.94)', fg: 'var(--prune-800)', bd: 'rgba(35,32,26,.08)' },
  };
  const t = tones[tone] || tones.sable;
  return (
    <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px',
      borderRadius: 3, fontSize: 10.5, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, whiteSpace: 'nowrap', ...style }}>
      {icon && <Icon name={icon} size={13} />}{children}
    </span>
  );
}

function Btn({ children, variant = 'primary', size = 'md', icon, iconRight, onClick, full, style }) {
  const h = size === 'lg' ? 52 : size === 'sm' ? 36 : 44;
  const pad = size === 'lg' ? '0 26px' : size === 'sm' ? '0 14px' : '0 18px';
  const fs = size === 'lg' ? 15.5 : size === 'sm' ? 13.5 : 14.5;
  const variants = {
    primary: { background: 'var(--coral-600)', color: 'var(--sable-50)', border: '1px solid var(--coral-700)', boxShadow: '0 1px 0 var(--coral-800)' },
    soft: { background: 'var(--coral-50)', color: 'var(--coral-700)', border: '1px solid var(--coral-300)', boxShadow: 'none' },
    outline: { background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--foreground)', boxShadow: 'none' },
    ghost: { background: 'transparent', color: 'var(--muted-fg)', border: '1px solid transparent', boxShadow: 'none' },
    white: { background: 'var(--sable-50)', color: 'var(--coral-700)', border: '1px solid var(--sable-50)', boxShadow: '0 6px 18px rgba(20,16,8,.18)' },
  };
  return (
    <button onClick={onClick} style={{ height: h, padding: pad, borderRadius: 6, cursor: 'pointer',
      fontSize: fs, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, width: full ? '100%' : 'auto', whiteSpace: 'nowrap', flex: 'none', transition: 'transform .12s, box-shadow .15s, background .15s',
      ...variants[variant], ...style }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
      {icon && <Icon name={icon} size={size === 'lg' ? 18 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 18 : 16} />}
    </button>
  );
}

/* Compatibilités (pills vert/rose/gris, comme le repo) */
function CompatPills({ cats, dogs, children, hideNeg }) {
  const items = [
    { value: cats, label: 'chats', icon: 'cat' },
    { value: dogs, label: 'chiens', icon: 'dog' },
    { value: children, label: 'enfants', icon: 'baby' },
  ].filter(it => it.value && (!hideNeg || it.value === 'oui'));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((it, i) => {
        const tone = it.value === 'oui' ? 'green' : it.value === 'non' ? 'rose' : 'sable';
        const txt = it.value === 'oui' ? `OK ${it.label}` : it.value === 'non' ? `Sans ${it.label}` : `${it.label} ?`;
        return <Pill key={i} tone={tone} icon={it.icon}>{txt}</Pill>;
      })}
    </div>
  );
}

/* ------------------------------ Données démo ------------------------------ */
const U = (id, w = 800) => (typeof window !== 'undefined' && window.__resources && window.__resources[id]) || `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const PETS = [
  { id: 'nala', name: 'Nala', species: 'chat', sex: 'femelle', age: 'chaton', breed: 'Européen', color: 'Roux tigré',
    city: 'Lyon 3e', dist: 1.2, shelter: 'Refuge des Brotteaux', fee: 120, photo: U('1514888286974-6c03e2ca1dba'),
    cats: 'oui', dogs: 'inconnu', children: 'oui', steril: true, chip: true, vacc: true, indoor: true, fiv: 'negatif',
    story: "Nala est une petite boule d'énergie rousse qui adore les jouets à plumes et finir la journée lovée contre vous. Sociable, elle s'entend bien avec ses congénères." },
  { id: 'maximus', name: 'Maximus', species: 'chien', sex: 'male', age: 'adulte', breed: 'Golden retriever', color: 'Fauve',
    city: 'Villeurbanne', dist: 3.4, shelter: 'SPA Lyon', fee: 250, photo: U('1552053831-71594a27632d'),
    cats: 'non', dogs: 'oui', children: 'oui', steril: true, chip: true, vacc: true,
    story: "Maximus est un grand cœur de 4 ans qui rêve de longues balades et de parties de balle. Parfait pour une famille active avec jardin." },
  { id: 'sushi', name: 'Sushi', species: 'chat', sex: 'male', age: 'adulte', breed: 'Européen', color: 'Noir et blanc',
    city: 'Lyon 6e', dist: 2.0, shelter: 'Asso Patte Douce', fee: 90, photo: U('1518791841217-8f162f1e1131'),
    cats: 'oui', dogs: 'non', children: 'inconnu', steril: true, chip: true, vacc: true, indoor: true, fiv: 'negatif',
    story: "Sushi est un gentleman tranquille qui cherche un canapé moelleux et une famille posée. Idéal pour un appartement calme." },
  { id: 'luna', name: 'Luna', species: 'chien', sex: 'femelle', age: 'jeune', breed: 'Border collie', color: 'Noir et blanc',
    city: 'Caluire', dist: 4.1, shelter: 'Refuge des Brotteaux', fee: 220, photo: U('1517849845537-4d257902454a'),
    cats: 'inconnu', dogs: 'oui', children: 'oui', steril: true, chip: true, vacc: true,
    story: "Luna déborde d'intelligence et d'énergie. Elle a besoin de stimulation mentale et d'un maître prêt à jouer et apprendre avec elle." },
  { id: 'mistigri', name: 'Mistigri', species: 'chat', sex: 'femelle', age: 'senior', breed: 'Persan', color: 'Gris',
    city: 'Lyon 7e', dist: 2.8, shelter: 'SPA Lyon', fee: 60, photo: U('1592194996308-7b43878e84a6'),
    cats: 'oui', dogs: 'inconnu', children: 'oui', steril: true, chip: true, vacc: true, indoor: true, fiv: 'negatif',
    story: "Mistigri attend depuis 8 mois. Cette mamie toute douce ne demande qu'un foyer calme pour couler des jours paisibles au coin du feu." },
  { id: 'pongo', name: 'Pongo', species: 'chien', sex: 'male', age: 'chaton', breed: 'Croisé', color: 'Tricolore',
    city: 'Bron', dist: 5.6, shelter: 'Asso Patte Douce', fee: 180, photo: U('1583511655857-d19b40a7a54e'),
    cats: 'inconnu', dogs: 'oui', children: 'oui', steril: false, chip: true, vacc: true,
    story: "Pongo est un chiot joueur de 4 mois, prêt à tout découvrir. Il aura besoin d'éducation positive et de beaucoup de câlins." },
  { id: 'olive', name: 'Olive', species: 'chat', sex: 'femelle', age: 'adulte', breed: 'Européen', color: 'Écaille de tortue',
    city: 'Lyon 2e', dist: 1.9, shelter: 'Refuge des Brotteaux', fee: 95, photo: U('1573865526739-10659fec78a5'),
    cats: 'non', dogs: 'non', children: 'non', steril: true, chip: true, vacc: true, indoor: false, fiv: 'negatif',
    story: "Olive a du caractère et le revendique. Elle saura vous adopter à sa façon, à son rythme, et n'aime pas partager son territoire." },
  { id: 'baloo', name: 'Baloo', species: 'chien', sex: 'male', age: 'senior', breed: 'Labrador', color: 'Sable',
    city: 'Vénissieux', dist: 6.2, shelter: 'SPA Lyon', fee: 120, photo: U('1537151625747-768eb6cf92b2'),
    cats: 'oui', dogs: 'oui', children: 'oui', steril: true, chip: true, vacc: true,
    story: "Baloo est un labrador senior d'une douceur infinie. Calme et affectueux, il fera le bonheur d'un foyer qui veut un compagnon paisible." },
];

const REPORTS = [
  { id: 'r1', type: 'perdu', species: 'chat', name: 'Tigrou', sex: 'male', color: 'Tigré marron', city: 'Lyon 3e',
    spot: 'Parc de la Tête d\u2019Or', when: 'il y a 2 j', date: '5 juin', chip: true, photo: U('1495360010541-f48722b34f7d', 400),
    signs: 'Collier bleu, très peureux', match: 78 },
  { id: 'r2', type: 'trouve', species: 'chat', name: null, sex: 'femelle', color: 'Gris', city: 'Villeurbanne',
    spot: 'Gratte-Ciel', when: 'hier', date: '6 juin', chip: false, photo: U('1533743983669-94fa5c4338ec', 400),
    signs: 'Semble bien soignée, sans collier', match: 0 },
  { id: 'r3', type: 'perdu', species: 'chien', name: 'Pacha', sex: 'male', color: 'Noir', city: 'Lyon 5e',
    spot: 'Vieux Lyon', when: 'il y a 5 j', date: '2 juin', chip: true, photo: U('1543466835-00a7907e9de1', 400),
    signs: 'Pucé, yeux clairs, récompense', match: 0, reward: true },
  { id: 'r4', type: 'trouve', species: 'chien', name: null, sex: 'inconnu', color: 'Roux', city: 'Bron',
    spot: 'Gare de Bron', when: "aujourd'hui", date: '7 juin', chip: false, photo: U('1561037404-61cd46aa615b', 400),
    signs: 'Jeune, très affectueux', match: 0 },
];

const PENSIONS = [
  { id: 'p1', name: 'Les Coussinets Dorés', city: 'Lyon 8e', dist: 3.1, cats: true, dogs: true, priceCat: 18, priceDog: 26,
    photo: U('1583337130417-3346a1be7dee', 600), services: ['Médication', 'Accès extérieur', 'Senior'], note: 4.9, reviews: 87, verified: true },
  { id: 'p2', name: 'La Maison des Matous', city: 'Villeurbanne', dist: 4.5, cats: true, dogs: false, priceCat: 15, priceDog: null,
    photo: U('1574144611937-0df059b5ef3e', 600), services: ['Chatterie climatisée', 'Médication', 'Surveillance nuit'], note: 4.8, reviews: 52, verified: true },
  { id: 'p3', name: 'Pension du Grand Parc', city: 'Caluire', dist: 5.8, cats: true, dogs: true, priceCat: 16, priceDog: 24,
    photo: U('1601758228041-f3b2795255f1', 600), services: ['Grand parc clos', 'Toilettage', 'Transport'], note: 4.7, reviews: 113, verified: true },
];

const STATS = { available: 248, adoptedMonth: 31, activeReports: 19, resolvedMonth: 12, shelters: 14, pensions: 8, resolvedTotal: 143 };

window.DORLOTER_DS = { Icon, Logo, Eyebrow, Rule, Pill, Btn, CompatPills, Marquee, Stamp, PETS, REPORTS, PENSIONS, STATS, U,
  useState, useEffect, useRef, useMemo };
