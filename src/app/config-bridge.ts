/**
 * UI layer may import only from `app/*`. Re-exports org-facing copy from config.
 */

import { config } from '../config';

export function getOrgName(): string {
  return config.org.name;
}

export function getGatePageTitle(): string {
  return `${config.org.name} — Entry`;
}

export function getAdminPageTitle(): string {
  return `${config.org.name} — Admin`;
}

export function getLogPageTitle(): string {
  return `${config.org.name} — Entry log`;
}
