export type Result<T, E> = Ok<T> | Err<E>
export interface Ok<T> {
  success: true
  value: T
}
export interface Err<E> {
  success: false
  value: E
}

export function isOk<T, E> (r: Result<T, E>): boolean {
  return r.success
}
