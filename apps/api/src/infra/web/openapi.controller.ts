/**
 * Document OpenAPI servi sur `/api/v1/openapi`.
 *
 * IMPORTANT : ce document décrit le CONTRAT STABLE (enveloppes `{data}` /
 * `{data,pagination}` / `{error}`, codes d'erreur, auth Bearer) mais n'énumère
 * PAS encore chaque endpoint (l'annotation exhaustive est le dernier chantier).
 * Comme l'API NestJS est iso-contrat avec l'API Rust qu'elle remplace, le client
 * typé déjà généré (`packages/api-client/src/types.gen.ts`) reste VALIDE : ne PAS
 * régénérer depuis ce document partiel, au risque d'appauvrir le client.
 */

import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/openapi')
export class OpenApiController {
  @Get()
  document(): Record<string, unknown> {
    return {
      openapi: '3.1.0',
      info: {
        title: 'Dorloter API',
        version: '0.1.0',
        description:
          "API Dorloter (NestJS). Document partiel : enveloppes et sécurité décrites ; " +
          "l'énumération exhaustive des routes est en cours. Le client mobile typé " +
          'existant reste valide (contrat identique).',
      },
      servers: [{ url: '/api/v1' }],
      paths: {
        '/health': {
          get: {
            summary: 'Sonde de disponibilité (API + base de données).',
            responses: {
              '200': {
                description: 'État du service.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            status: { type: 'string' },
                            database: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
          Pagination: {
            type: 'object',
            properties: {
              cursor: { type: ['string', 'null'] },
              hasMore: { type: 'boolean' },
            },
            required: ['hasMore'],
          },
          Error: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                  details: { type: 'object', additionalProperties: true },
                },
                required: ['code', 'message'],
              },
            },
            required: ['error'],
          },
        },
      },
    };
  }
}
