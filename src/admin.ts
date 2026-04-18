import { canRunApp } from './app/https-bootstrap';
import { initDatabase } from './infra/contracts';
import { mountAdminView } from './ui/admin-view';

async function bootstrap(): Promise<void> {
  if (!canRunApp()) return;
  await initDatabase();
  mountAdminView();
}

void bootstrap();
