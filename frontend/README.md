# Santander Cycle Stats - Frontend

React + TypeScript + Vite frontend application for analysing Santander Cycle ride data.

## Quick Start

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Console Scripts

The scraping scripts are located in `public/scripts/`:

- `fetch-ride-summaries.js` - Fetches list of all rides (Script A)
- `fetch-ride-details.js` - Fetches detailed information for each ride (Script B)

These scripts are designed to be copied and pasted into the browser console when logged into the Santander Cycle website.

## Future Visualizations

Planned libraries and methods:

- **Charts**: Chart.js via `react-chartjs-2` (already installed)
- **Maps**: Leaflet + OpenStreetMap (to be installed when needed)
  - Install: `npm install leaflet react-leaflet @types/leaflet`

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Chart.js / react-chartjs-2 (for future charts)
