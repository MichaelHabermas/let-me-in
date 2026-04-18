import { bootstrapApp } from './app/bootstrap-app';
import { mountLogView } from './ui/log-view';

void bootstrapApp({ mount: mountLogView }).then((result) => {
  if (result.ok) return;
  if (result.reason === 'https') return;
  console.error('[Gatekeeper] bootstrap failed', result);
});
