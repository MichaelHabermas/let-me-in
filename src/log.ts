import { canRunApp } from './app/https-bootstrap';
import { initDatabase } from './infra/contracts';
import { mountLogView } from './ui/log-view';

async function bootstrap(): Promise<void> {
  if (!canRunApp()) return;
  await initDatabase();
  mountLogView();
}

void bootstrap();
