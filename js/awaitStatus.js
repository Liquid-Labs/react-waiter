// The stati are powers of 2 so we can bit-or them.
const awaitStatus = {
  UNCHECKED : 0,
  BLOCKED   : 1,
  WAITING   : 2,
  RESOLVED  : 4,
}

export { awaitStatus }
