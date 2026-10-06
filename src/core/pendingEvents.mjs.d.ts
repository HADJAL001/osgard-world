export declare function reconcilePendingEvents<T extends { id: string }>(latest: T[], completed: Set<string>, failed: T[]): T[]
declare module '*.mjs' {
  export function reconcilePendingEvents<T extends { id: string }>(latest: T[], completed: Set<string>, failed: T[]): T[]
}
