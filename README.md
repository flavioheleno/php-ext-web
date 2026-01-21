# php-ext-web

A web dashboard to monitor PHP extension build status across different operating systems, PHP versions, and architectures.

## Features

- **Grid and List Views** - Switch between compact grid and detailed list views
- **Filtering** - Filter by extension name, OS, PHP version, architecture, and build status
- **Build Details** - Click any extension to view detailed build information
- **Dark Mode** - Automatic dark/light theme support
- **Keyboard Navigation** - Use `/` to search, `j`/`k` to navigate, `Esc` to close

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

## License

See [LICENSE](LICENSE) for details.
