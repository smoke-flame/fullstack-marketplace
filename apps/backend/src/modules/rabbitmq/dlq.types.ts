export type BaseDlqPayload<TEvent extends string, TOriginalPayload> = {
    originalEventType: TEvent;
    originalPayload: TOriginalPayload;
    reason: string;
    failedAt: string;
    correlationId: string;
};
