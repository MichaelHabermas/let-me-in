export async function disposeSafely(label: string, dispose: () => Promise<void>): Promise<void> {
  try {
    await dispose();
  } catch (error) {
    console.warn(`[${label}] dispose failed`, error);
  }
}
