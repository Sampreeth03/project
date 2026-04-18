const swaggerJsdoc = require('swagger-jsdoc');

const publicApiBaseUrl = String(process.env.PUBLIC_API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`).trim().replace(/\/$/, '');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WBD API',
      version: '1.0.0',
      description: 'API docs for recruiter and job operations',
    },
    servers: [
      {
        url: publicApiBaseUrl,
        description: 'API server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT auth cookie',
        },
      },
      schemas: {
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Unauthorized' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Recruiter', description: 'Recruiter dashboard and job management APIs' },
      { name: 'Job', description: 'Student job application and notification APIs' },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

// Hide selected endpoints from Swagger UI while keeping routes active.
['/api/apply-job'].forEach((pathKey) => {
  if (swaggerSpec.paths && swaggerSpec.paths[pathKey]) {
    delete swaggerSpec.paths[pathKey];
  }
});

module.exports = { swaggerSpec };
