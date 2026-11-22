// Use the satellite-only style from the Static Tiles API. All labels are separate
// vector layers, so zooming never introduces shop icons or business names.
export default function satelliteStyle(token) {
  const name = ['coalesce', ['get', 'name:ru'], ['get', 'name'], ''];
  const labelPaint = {
    'text-color': '#fff',
    'text-halo-color': 'rgba(28,35,38,0.9)',
    'text-halo-width': 1.5,
  };
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      imagery: {
        type: 'raster',
        tiles: ['https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}.jpeg?access_token=' + encodeURIComponent(token)],
        tileSize: 512,
        maxzoom: 19,
        attribution: '<a href="https://www.mapbox.com/about/maps/">© Mapbox</a> © Maxar <a href="https://www.mapbox.com/map-feedback/">Improve this map</a>',
      },
      streets: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
    },
    layers: [
      { id: 'satellite', type: 'raster', source: 'imagery' },
      {
        id: 'major-roads', type: 'line', source: 'streets', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]],
        paint: {
          'line-color': '#eed293',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 12, 1.5, 16, 2],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.8, 16, 0.15],
        },
      },
      {
        id: 'cities', type: 'symbol', source: 'streets', 'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village']]],
        layout: { 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': 15, 'text-padding': 5, 'symbol-sort-key': ['coalesce', ['get', 'rank'], 10] },
        paint: labelPaint,
      },
      {
        id: 'street-names', type: 'symbol', source: 'streets', 'source-layer': 'transportation_name', minzoom: 11,
        layout: { 'symbol-placement': 'line', 'symbol-spacing': 350, 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-rotation-alignment': 'map', 'text-pitch-alignment': 'viewport' },
        paint: labelPaint,
      },
    ],
  };
}
