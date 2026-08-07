export interface NotificationTemplate<T extends Record<string, unknown>> {
  render(payload: T): Record<string, unknown>;
}
