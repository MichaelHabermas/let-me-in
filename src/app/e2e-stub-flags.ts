export type E2eStubFlags = {
  gate: boolean;
  enrollment: boolean;
};

export function readE2eStubFlags(): E2eStubFlags {
  return {
    gate: import.meta.env.VITE_E2E_STUB_GATE === 'true',
    enrollment: import.meta.env.VITE_E2E_STUB_ENROLL === 'true',
  };
}
