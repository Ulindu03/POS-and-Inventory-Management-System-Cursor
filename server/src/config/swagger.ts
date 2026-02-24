import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';
import fs from 'fs';
import { version } from '../../package.json';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'VoltZone POS API',
    version,
    description: 'API documentation for VoltZone POS and Inventory system',
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Local' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

/**
 * Recursively find files matching an extension inside a directory.
 * Returns forward-slash normalised absolute paths.
 */
function findFiles(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full.replace(/\\/g, '/'));
    }
  }
  return results;
}

const distRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(distRoot, '..');

// swagger-jsdoc v1 does NOT expand globs — it reads each path literally.
// Resolve files ourselves so it always gets real file paths.
const apiFiles = [
  ...findFiles(path.join(distRoot, 'routes'), '.js'),
  ...findFiles(path.join(distRoot, 'controllers'), '.js'),
  ...findFiles(path.join(projectRoot, 'src', 'routes'), '.ts'),
  ...findFiles(path.join(projectRoot, 'src', 'controllers'), '.ts'),
];

export const swaggerSpec = swaggerJSDoc({
  swaggerDefinition: swaggerDefinition as any,
  apis: apiFiles,
});
