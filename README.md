# fire-recovery-frontend

Fire severity page for the DSE fire recovery project: draw or upload a fire
perimeter and submit a burn severity analysis to the backend (`POST /v2/severity`).
While the page is open it shows the result on the map (dNBR, RdNBR or RBR on a
yellow-to-red ramp with an adjustable range); the backend also emails the requester.

```sh
pnpm install
pnpm run dev   # http://localhost:3000/fireSeverity.html, talks to the dev backend
```

No build step: `src/` is deployed as is (`dev` and `main` branches, see `.github/workflows/deploy.yml`).

Code layout (Model-View-Presenter):

- `src/js/features/severity/`: the feature's contract, model, view, presenter and factory
- `src/js/shared/api/`: endpoints and the API client
- `src/js/shared/map/`: MapLibre map, layers, and drawing (via [GLEN](https://github.com/SchmidtDSE/glen) modules)
- `src/js/shared/utils/`: GeoJSON, file, date and DOM helpers
