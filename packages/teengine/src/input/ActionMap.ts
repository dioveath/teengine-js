/** Maps action names to KeyboardEvent.code values. */
export class ActionMap {
  private readonly bindings = new Map<string, Set<string>>();

  bind(action: string, codes: readonly string[]): void {
    this.bindings.set(action, new Set(codes));
  }

  unbind(action: string): void {
    this.bindings.delete(action);
  }

  getCodes(action: string): readonly string[] {
    const codes = this.bindings.get(action);
    return codes ? [...codes] : [];
  }

  hasAction(action: string): boolean {
    return this.bindings.has(action);
  }
}
