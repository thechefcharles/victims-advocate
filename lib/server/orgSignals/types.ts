export type SignalCompleteness = "minimal" | "partial" | "complete" | null;
export type SignalConfidence = "low" | "medium" | "high";

export type OrganizationSignals = {
  organizationId: string;
  computedAt: string;
  profile: {
    profileStatus: string | null;
    profileStage: string | null;
    lastProfileUpdate: string | null;
    completeness: SignalCompleteness;
  };
  cases: {
    total: number;
    active: number;
    stale: number;
    avgAgeDays: number | null;
  };
  messaging: {
    orgCasesWithMessages: number;
    recentMessageThreads: number;
    avgFirstReplyHours: number | null;
    replySignalConfidence: SignalConfidence;
  };
  workflow: {
    routingUsageRate: number | null;
    completenessUsageRate: number | null;
    ocrUsageRate: number | null;
    appointmentsUsageRate: number | null;
  };
  completeness: {
    blockingIssueRate: number | null;
    casesWithMissingDocsRate: number | null;
  };
  flags: string[];
};

