import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { swaggerUI } from '@hono/swagger-ui';

import { routes } from '@/routes';

import type { KVNamespace } from '@cloudflare/workers-types';
import type { HttpBindings } from '@hono/node-server';

type AppContext = {
  Bindings: {
    dokidokiKV: KVNamespace;
    http: HttpBindings;
  };
};

const app = new OpenAPIHono<AppContext>();

const isNode =
  typeof process !== 'undefined' &&
  process.versions != null &&
  process.versions.node != null;

const registerCFModuleForNode = async () => {
  const miniflareKv = await import('@miniflare/kv');
  const miniflareStorageFile = await import('@miniflare/storage-file');
  app.use(
    '*',
    createMiddleware<AppContext>(async (ctx, next) => {
      ctx.env.dokidokiKV = new miniflareKv.KVNamespace(
        new miniflareStorageFile.FileStorage('./data'),
      ) as unknown as KVNamespace;
      await next();
    }),
  );
};

const serveForNode = async (honoApp: typeof app) => {
  const nodeServer = await import('@hono/node-server');
  nodeServer.serve(honoApp, (it) => {
    console.log(`Server listening on http://${it.address}:${it.port}`);
  });
};

app.use(
  '*',
  cors({
    origin: [isNode ? 'http://localhost:3000' : 'https://dokidoki.zvz.be'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  }),
);

routes.forEach(({ route, handler }) => app.openapi(route, handler));

app.doc('/doc', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Rabbit Backend API',
  },
});

app.get('/swagger', swaggerUI({ url: '/doc' }));

if (isNode) {
  registerCFModuleForNode().then(() => serveForNode(app));
}

// for Cloudflare Workers
export default app;