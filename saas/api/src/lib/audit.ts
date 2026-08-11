import { db, schema } from "../db/client.js";
import type { Principal } from "./auth.js";

export function audit(
  p: Principal,
  action: string,
  entity: string,
  entityId?: string,
  meta: Record<string, unknown> = {}
) {
  db.insert(schema.auditLogs)
    .values({ companyId: p.companyId, userId: p.userId, action, entity, entityId, meta })
    .then(() => {})
    .catch(() => {});
}
