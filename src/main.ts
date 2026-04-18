import { canRunApp } from './app/https-bootstrap';
import { initDatabase } from './infra/contracts';
import { mountGateView } from './ui/gate-view';

async function bootstrap(): Promise<void> {
  if (!canRunApp()) return;
  await initDatabase();
  mountGateView();
}

void bootstrap();
