// The stati are powers of 2 so we can bit-or them.
const waiterStatus = {
  UNCHECKED : 0,
  BLOCKED   : 1,
  WAITING   : 2,
  RESOLVED  : 4,
}

const waiterStatusToString = {
  [waiterStatus.UNCHECKED] : 'Unchecked',
  [waiterStatus.BLOCKED]   : 'Blocked',
  [waiterStatus.WAITING]   : 'Waiting',
  [waiterStatus.RESOLVED]  : 'Resolved'
}

export { waiterStatus, waiterStatusToString }
