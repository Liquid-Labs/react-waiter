/* global describe, document, expect, jest, test */
import React from 'react'
import { render, testHook } from 'react-testing-library'

import { useAwait } from './useAwait'
import { awaitStatus } from '../awaitStatus'

const TestComponent = ({ready}) => {
  const check = () => ({
    status      : ready ? awaitStatus.WAITING : awaitStatus.RESOLVED,
    description : ready ? 'Ready.' : 'Not ready.'
  })
  const awaitReport = useAwait([check])
  return <span>{awaitReport[0]}</span>
}

describe('useAwait', () => {
  jest.useFakeTimers()

  test('processes an initially resolved check without setting interval', () => {
    let report
    testHook(() => (report = useAwait([() => ({status : awaitStatus.RESOLVED})])))
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
      testHook(() => useAwait([() => ({status : awaitStatus.WAITING})]))
    expect(setInterval).toHaveBeenCalledTimes(1)
    expect(clearInterval).toHaveBeenCalledTimes(0)
    unmount()
    expect(clearInterval).toHaveBeenCalledTimes(1)
  })
})
