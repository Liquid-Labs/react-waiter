/* global describe, expect, jest, test */
import React from 'react'
import { render } from 'react-testing-library'

import { Await, awaitStatus } from './Await'

const waitingCheck = () => ({ status : awaitStatus.WAITING })
const resolvedCheck = () => ({ status : awaitStatus.RESOLVED })
const noOpChild = () => null

describe('Await', () => {
  jest.useFakeTimers()

  test('processes an initially resolved check without setting interval', () => {
    render(
      <Await name="test" checks={[ resolvedCheck ]}>{noOpChild}</Await>
    )
    expect(setInterval).toHaveBeenCalledTimes(0)
  })

  test('clears interval after initially unresolved check resolves and is stable thereafter', () => {
    // This was originally two tests, but everything to the second re-render
    // would be the same, so might as well hit both.
    let checks = [ waitingCheck ]

    const { rerender } = render(
      <Await name="test" checks={checks}>{ noOpChild }</Await>
    )
    expect(setInterval).toHaveBeenCalledTimes(1)
    expect(clearInterval).toHaveBeenCalledTimes(0)
    checks = [ resolvedCheck ]
    rerender(
      <Await name="test" checks={checks}>{ noOpChild }</Await>
    )
    expect(setInterval).toHaveBeenCalledTimes(1)
    expect(clearInterval).toHaveBeenCalledTimes(1)
    rerender(
      <Await name="test" checks={checks}>{ noOpChild }</Await>
    )
    expect(setInterval).toHaveBeenCalledTimes(1)
    expect(clearInterval).toHaveBeenCalledTimes(1)
  })

  test('interval cleared on unmount', () => {
    const checks = [ waitingCheck ]

    const { unmount } = render(
      <Await name="test" checks={checks}>{ noOpChild }</Await>
    )
    expect(setInterval).toHaveBeenCalledTimes(1)
    expect(clearInterval).toHaveBeenCalledTimes(0)
    unmount()
    expect(clearInterval).toHaveBeenCalledTimes(1)
  })

  test("'followupHandler' is triggered after the 'followupWait'", () => {
    let followedUp = false
    const followupHandler = () => followedUp = true

    render(
      <Await name="test" checks={[ waitingCheck ]} followupWait={1000}
          followupHandler={followupHandler}>
        { noOpChild }
      </Await>
    )
    expect(followedUp).toBe(false)
    jest.advanceTimersByTime(500)
    expect(followedUp).toBe(false)
    jest.advanceTimersByTime(500)
    expect(followedUp).toBe(true)
  })
/*
  test('final report status is ordered by severity', () => {
    const uncheckedCheck = () => ({status : awaitStatus.UNCHECKED})
    const blockedCheck = () => ({status : awaitStatus.BLOCKED})

    const checks = [ resolvedCheck, blockedCheck, uncheckedCheck, waitingCheck ]
    let report
    testHook(() => (report = useAwait('test', checks)))
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
    testHook(() => useAwait('test', [waitingCheck], config))
    expect(report).toBe(null)
    jest.advanceTimersByTime(500)
    expect(report).toBe(null)
    jest.advanceTimersByTime(500)
    expect(report).toBe('test is waiting.')
  })*/
})
