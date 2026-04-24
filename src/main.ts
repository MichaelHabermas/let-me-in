import { mountGateView } from './app/mount-gate';
import { readE2eStubFlags } from './app/e2e-stub-flags';
import { createE2eEnrollmentCamera } from './app/enroll-e2e-doubles';
import { createE2eGateEmbedder, createE2eGateYoloDetector } from './app/gate-e2e-doubles';
import { runBootstrap } from './app/run-bootstrap';

const flags = readE2eStubFlags();

runBootstrap(() =>
  mountGateView({
    hostDepsOverrides: flags.gate
      ? {
          createCamera: (_video, canvas, options) => {
            void options;
            return createE2eEnrollmentCamera(canvas.width, canvas.height);
          },
          createYoloDetector: () => createE2eGateYoloDetector(),
          createFaceEmbedder: () => createE2eGateEmbedder(),
        }
      : undefined,
  }),
);
