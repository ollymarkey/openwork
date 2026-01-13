import { Hono } from "hono";
import { agentRoutes } from "./agents";
import { sessionRoutes } from "./sessions";
import { skillRoutes } from "./skills";
import { toolRoutes } from "./tools";

export const v1Routes = new Hono()
  .route("/agents", agentRoutes)
  .route("/sessions", sessionRoutes)
  .route("/skills", skillRoutes)
  .route("/tools", toolRoutes);

export type V1Routes = typeof v1Routes;
