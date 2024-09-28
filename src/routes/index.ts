import type { createRoute } from '@hono/zod-openapi';
import type { Handler } from 'hono';

export type RouteType = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
};

export const routes: RouteType[] = [];
