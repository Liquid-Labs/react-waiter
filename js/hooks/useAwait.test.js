/* global describe, expect, jest, test */
import { testHook } from 'react-testing-library'

import { useAwait } from './useAwait'
import { awaitStatus } from '../awaitStatus'

const waitingCheck = () => ({ status : awaitStatus.WAITING })
const resolvedCheck = () => ({ status : awaitStatus.RESOLVED })

describe('useAwait', () => {
  jest.useFakeTimers()

  test('processes an initially resolved check without setting interval', () => {
    let report
    testHook(() => (report = useAwait([resolvedCheck])))
    expect(report.finalStatus).toBe(awaitStatus.RESOLVED)
    expect(setInterval).toHaveBeenCalledTimes(0)
  })

  test('clears interval after initially unresolved check resolves', () => {
    let report
    let status = awaitStatus.WAITING
    const { rerender } =
      testHook(() => (report = useAwait([() => ({status : status})])))
    expect(report.finalStatus).toBe(awaitStatus.WAITING)
    expect(setInterval).toHaveBeenCalledTimes(1)
    expect(clearInterval).toHaveBeenCalledTimes(0)
    status = awaitStatus.RESOLVED
    rerender()
    expect(clearInterval).toHaveBeenCalledTimes(1)
  })

  test('setting and clearing intervals is stable once resolved', () => {
    let status = awaitStatus.WAITING
    const { rerender } =
      testHook(() => useAwait([() => ({status : status})]))
    expect(setInterval).toHaveBeenCalledTimes(1)
    expect(clearInterval).toHaveBeenCalledTimes(0)
    status = awaitStatus.RESOLVED
    rerender()
    expect(setInterval).toHaveBeenCalledTimes(1)
    expect(clearInterval).toHaveBeenCalledTimes(1)
    rerender()
    expect(setInterval).toHaveBeenCalledTimes(1)
    expect(clearInterval).toHaveBeenCalledTimes(1)
  })

  test('interval cleared on unmount', () => {
    const { unmount } =
      testHook(() => useAwait([waitingCheck]))
    expect(setInterval).toHaveBeenCalledTimes(1)
    expect(clearInterval).toHaveBeenCalledTimes(0)
    unmount()
    expect(clearInterval).toHaveBeenCalledTimes(1)
  })

  test("'checkResponse' is triggered after the 'checkWait'", () => {
    let responded = false
    const config = { checkResponse : () => responded = true, checkWait : 1000 }
    testHook(() => useAwait([waitingCheck], config))
    expect(responded).toBe(false)
    jest.advanceTimersByTime(500)
    expect(responded).toBe(false)
    jest.advanceTimersByTime(500)
    expect(responded).toBe(true)
  })

  test('final report status is ordered by severity', () => {
    const uncheckedCheck = () => ({status : awaitStatus.UNCHECKED})
    const blockedCheck = () => ({status : awaitStatus.BLOCKED})

    const checks = [ resolvedCheck, blockedCheck, uncheckedCheck, waitingCheck ]
    let report
    testHook(() => (report = useAwait(checks)))
    expect(report.statusInfo).toHaveLength(4)
    expect(report.statusInfo[0].status).toBe(awaitStatus.UNCHECKED)
    expect(report.statusInfo[1].status).toBe(awaitStatus.BLOCKED)
    expect(report.statusInfo[2].status).toBe(awaitStatus.WAITING)
    expect(report.statusInfo[3].status).toBe(awaitStatus.RESOLVED)
  })

  test("default alert issued if unresolved after 'waitCheck'", () => {
    let report = null
    jest.spyOn(window, 'alert').mockImplementation((out) => report = out);
    const config = { checkWait : 1000 }
    testHook(() => useAwait([waitingCheck], config))
    expect(report).toBe(null)
    jest.advanceTimersByTime(500)
    expect(report).toBe(null)
    jest.advanceTimersByTime(500)
    expect(report).toBe("Unamed await is waiting.")
  })
})
