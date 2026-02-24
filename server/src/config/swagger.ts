import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';
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

const srcRoot = path.resolve(__dirname, '..');
// In production (dist/), only .js files exist. Use simple glob patterns.
const apisGlobs = [
  path.join(srcRoot, 'routes', '**', '*.js').replace(/\\/g, '/'),
  path.join(srcRoot, 'controllers', '**', '*.js').replace(/\\/g, '/'),
];

export const swaggerSpec = swaggerJSDoc({
  swaggerDefinition: swaggerDefinition as any,
  apis: apisGlobs,
});
