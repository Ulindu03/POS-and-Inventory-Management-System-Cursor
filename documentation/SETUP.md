# Setup & Run — VoltZone POS

Prerequisites
- Node.js (recommended LTS)
- npm
- MongoDB (local or cloud)

Frontend (client)
- Install:

```bash
cd client
npm install
```

- Development:

```bash
npm run dev
# opens Vite dev server (usually http://localhost:5173)
```

- Build for production:

```bash
npm run build
```

Backend (server)
- Install and configure environment variables for MongoDB (e.g., `MONGODB_URI`), PORT.

```bash
cd server
npm install
```

- Development (nodemon / ts-node):

```bash
npm run dev
```

- Build TypeScript:

```bash
npm run build   # runs tsc
```

- Run production build (example):

```bash
node dist/server.js
```

Troubleshooting build errors
- If `tsc` fails with property access on `ObjectId`, either populate the document before accessing nested fields or cast to `any` where safe.
- For frontend TypeScript errors, add explicit parameter types in `map` callbacks or adjust `tsconfig` `noImplicitAny` if appropriate.
