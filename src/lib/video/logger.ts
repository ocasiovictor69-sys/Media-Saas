export function logStep(step: string) {
  const time = new Date().toISOString();
  console.log(`[${time}] ▶ ${step}`);
}
