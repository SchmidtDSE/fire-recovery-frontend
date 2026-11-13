/**
 * Fire severity page entry point.
 *
 * The feature is imported dynamically so that a failed dependency (MapLibre,
 * GLEN or mapbox-gl-draw from their CDNs, or an integrity mismatch) shows a
 * message instead of leaving a dead page.
 */
try {
  const { SeverityFactory } = await import('./features/severity/severity-factory.js');
  await SeverityFactory.create().presenter.initialize();
} catch (err) {
  console.error('Fire severity failed to load', err);
  document.getElementById('load-error').hidden = false;
}
