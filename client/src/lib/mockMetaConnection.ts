export type MockMetaConnection = {
  displayPhoneNumber: string;
  verifiedName: string;
  qualityRating: string;
  simulatedAt: string;
};

export function mockMetaStorageKey(agentId: number) {
  return `neon.mock-meta.${agentId}`;
}

export function createMockMetaConnection(agentName: string, now = new Date().toISOString()): MockMetaConnection {
  return {
    displayPhoneNumber: "+962 7 9000 0000",
    verifiedName: `${agentName} (محاكاة)`,
    qualityRating: "GREEN",
    simulatedAt: now,
  };
}
