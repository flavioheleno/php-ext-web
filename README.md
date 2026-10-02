# php-ext-web

A web dashboard to monitor PHP extension build status across different operating systems, PHP versions, and architectures.

## Features

- **Grid and List Views** - Switch between compact grid and detailed list views
- **Filtering** - Filter by extension name, OS, PHP version, architecture, and build status
- **Build Details** - Click any extension to view detailed build information
- **Dark Mode** - Automatic dark/light theme support
- **Keyboard Navigation** - Use `/` to search, `j`/`k` to navigate, `Esc` to close

Filters distinguish all, some, and no selected options. **All Passing** and
**Has Failures** select extensions within the chosen environments; status
filters never remove builds from the success-rate denominator. Detail totals
use the same environment scope, with a separate **Failed only** build toggle.

The list shows 25 extensions per page and the matrix shows 10. Matrix headers
include OS, PHP, and architecture labels; build-log links open in a new tab.
Detail links work on initial navigation, and both native dialogs manage
keyboard focus and restore it when closed.

## Tech Stack

- [Vue 3](https://vuejs.org/) with Composition API
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vitest](https://vitest.dev/) for testing

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun run test

# Build for production
bun run build
```

## Data Source

Build data is fetched from [php-ext-farm](https://github.com/flavioheleno/php-ext-farm).
Deployment copies `latest.json`, `history/`, and `reports/` from its dataset
branch before generating per-version history files. History preserves each
reported architecture; missing combinations are not counted as failures.

## License

See [LICENSE](LICENSE) for details.
