export function isMockMode(): boolean {
  return process.env.MOCK_MODE === "true";
}
