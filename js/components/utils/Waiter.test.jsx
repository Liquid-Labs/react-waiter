/* global afterEach beforeEach describe expect jest test */
import React from 'react'
import { act, cleanup, render } from 'react-testing-library'

import { Waiter } from './Waiter'
import { waiterStatus } from '../../utils/status'
import { basicWaiterSetup, waiterSettings } from '../../settings'
import * as msgs from '../msgs'

const waitingCheck = () => ({ status : waiterStatus.WAITING })
const resolvedCheck = () => ({ status : waiterStatus.RESOLVED })
const blockerCheck = () => ({ status : waiterStatus.BLOCKED })
const noOpChild = jest.fn(() => null)
const testSpinner = jest.fn(() => null)
const testBlocker = jest.fn(() => null)
const spinnerAndBlocker = {
  spinner : testSpinner,
  blocker : testBlocker
}
const expectChildSpinnerBlocker = (childN, spinnerN, blockerN) => {
  expect(noOpChild).toHaveBeenCalledTimes(childN)
  expect(testSpinner).toHaveBeenCalledTimes(spinnerN)
  expect(testBlocker).toHaveBeenCalledTimes(blockerN)
}

const followupWaitMarker = 321
const followupTimeoutCallCount = () =>
  setTimeout.mock.calls.reduce(
    (count, callInfo) =>
      count + (callInfo[1] === followupWaitMarker ? 1 : 0),
    0)

describe('Waiter', () => {
  jest.useFakeTimers()
  // Without the cleanup, you can see strang effects, like the 'getByTestId' in
  // the "can render [a function|alement]" tests are entangled. It seems
  // react-testing-library uses the same DOM for subsequent tests.
  beforeEach(() => window.alert = jest.fn())
  afterEach(() => {
    cleanup()
    jest.clearAllMocks()
    waiterSettings.reset()
  })

  test("can render a function child", () => {
    basicWaiterSetup()
    const content = "I'm from a func!"
    const { getByTestId } = render(
      <Waiter name="test" checks={[ resolvedCheck ]}>
        { () => <span data-testid="content">{content}</span> }
      </Waiter>
    )
    expect(getByTestId('content').textContent).toBe(content)
  })

  test("can render element children", () => {
    basicWaiterSetup()
    const content = "I'm from an element!"
    const { getByTestId } = render(
      <Waiter name="test" checks={[ resolvedCheck ]}>
        <span data-testid="content">{content}</span>
      </Waiter>
    )
    expect(getByTestId('content').textContent).toBe(content)
  })

  test('renders the spinner function once on initially unresolved render', () => {
    render(
      <Waiter name="test" {...spinnerAndBlocker} checks={[ waitingCheck ]}>
        {noOpChild}
      </Waiter>
    )
    // Note that since react-testing-library wraps the 'render' with 'act',
    // enqued effects are guaranteed to run before exiting the render, so this
    // is a good test in-so-far as it's waiting on the 'useEffect' and not just
    // racing with the initial render.
    expectChildSpinnerBlocker(0, 1, 0)
  })

  test('renders blocker on initially blocker status', () => {
    render(
      <Waiter name="test" {...spinnerAndBlocker} checks={[ blockerCheck ]}>
        {noOpChild}
      </Waiter>
    )
    expectChildSpinnerBlocker(0, 0, 1)
  })

  test('transitions through all states cleanly', () => {
    const { rerender } = render(
      <Waiter name="test" {...spinnerAndBlocker} checks={[ waitingCheck ]}>
        {noOpChild}
      </Waiter>
    )
    expectChildSpinnerBlocker(0, 1, 0)

    rerender(
      <Waiter name="test" {...spinnerAndBlocker} checks={[ blockerCheck ]}>
        {noOpChild}
      </Waiter>
    )
    expectChildSpinnerBlocker(0, 1, 1)

    rerender(
      <Waiter name="test" {...spinnerAndBlocker} checks={[ resolvedCheck ]}>
        {noOpChild}
      </Waiter>
    )
    expectChildSpinnerBlocker(1, 1, 1)
  })

  test('processes an initially resolved check without setting followup timeout', () => {
    basicWaiterSetup()
    render(
      <Waiter name="test" checks={[ resolvedCheck ]} followupWait={followupWaitMarker}>
        {noOpChild}
      </Waiter>
    )

    expect(followupTimeoutCallCount()).toBe(0)
  })

  test("'followupHandler' is not invoked after initial wait resolves", () => {
    basicWaiterSetup()
    const followupTester = jest.fn()
    let checks = [ waitingCheck ]

    const { rerender } = render(
      <Waiter name="test"
          checks={checks}
          followupHandler={followupTester}
          followupWait={followupWaitMarker}>
        {noOpChild}
      </Waiter>
    )
    expect((followupTimeoutCallCount())).toBe(1)
    expect(clearTimeout).toHaveBeenCalledTimes(0)
    checks = [ resolvedCheck ]
    rerender(
      <Waiter name="test"
          checks={checks}
          followupHandler={followupTester}
          followupWait={followupWaitMarker}>
        {noOpChild}
      </Waiter>
    )
    expect(followupTimeoutCallCount()).toBe(1)
    expect(clearTimeout).toHaveBeenCalledTimes(1)
    rerender(
      <Waiter name="test"
          checks={checks}
          followupHandler={followupTester}
          followupWait={followupWaitMarker}>
        {noOpChild}
      </Waiter>
    )
    act(() => jest.advanceTimersByTime(followupWaitMarker * 3))
    expect(followupTimeoutCallCount()).toBe(1)
    expect(clearTimeout).toHaveBeenCalledTimes(1)
    expect(followupTester).toHaveBeenCalledTimes(0)
  })

  test('interval cleared on unmount', () => {
    basicWaiterSetup()
    const checks = [ waitingCheck ]

    const { unmount } = render(
      <Waiter name="test" checks={checks} followupWait={followupWaitMarker}>{ noOpChild }</Waiter>
    )
    expect(followupTimeoutCallCount()).toBe(1)
    expect(clearTimeout).toHaveBeenCalledTimes(0)
    unmount()
    expect(clearTimeout).toHaveBeenCalledTimes(1)
  })

  test("'followupHandler' should be called no more than 'followupMax' times", () => {
    basicWaiterSetup()
    const followupTester = jest.fn()
    const checks = [ waitingCheck ]
    render(
      <Waiter name="test" checks={checks}
          followupWait={followupWaitMarker}
          followupHandler={followupTester}
          followupMax={3}>
        { noOpChild }
      </Waiter>
    )
    act(() => jest.advanceTimersByTime(followupWaitMarker))
    expect(followupTester).toHaveBeenCalledTimes(1)
    act(() => jest.advanceTimersByTime(followupWaitMarker))
    expect(followupTester).toHaveBeenCalledTimes(2)
    act(() => jest.advanceTimersByTime(followupWaitMarker))
    expect(followupTester).toHaveBeenCalledTimes(3)
    expect(followupTimeoutCallCount()).toBe(3)
    act(() => jest.advanceTimersByTime(followupWaitMarker))
    expect(followupTester).toHaveBeenCalledTimes(3)
    expect(followupTimeoutCallCount()).toBe(3)
  })

  test("'followupHandler' is triggered after the 'followupWait'", () => {
    basicWaiterSetup()
    let followedUp = false
    const followupHandler = () => followedUp = true

    render(
      <Waiter name="test" checks={[ waitingCheck ]} followupWait={1000}
          followupHandler={followupHandler}>
        { noOpChild }
      </Waiter>
    )
    expect(followedUp).toBe(false)
    jest.advanceTimersByTime(500)
    expect(followedUp).toBe(false)
    jest.advanceTimersByTime(500)
    expect(followedUp).toBe(true)
  })

  test("'followupHandler' is triggered once immediately after blocker, and then no more", () => {
    basicWaiterSetup()
    const followupTester = jest.fn()
    let checks = [ waitingCheck ]
    const { rerender } = render(
      <Waiter name="test"
          checks={checks}
          followupHandler={followupTester}
          followupWait={followupWaitMarker}>
        {noOpChild}
      </Waiter>
    )
    expect(followupTimeoutCallCount()).toBe(1)
    expect(followupTester).toHaveBeenCalledTimes(0)
    act(() => jest.advanceTimersByTime(followupWaitMarker))
    expect(followupTimeoutCallCount()).toBe(2) // on the initial render, and then after advance
    expect(followupTester).toHaveBeenCalledTimes(1)
    checks = [ blockerCheck ]
    rerender(
      <Waiter name="test"
          checks={checks}
          followupHandler={followupTester}
          followupWait={followupWaitMarker}>
        {noOpChild}
      </Waiter>
    )
    expect(followupTimeoutCallCount()).toBe(2)
    expect(followupTester).toHaveBeenCalledTimes(2)
    act(() => jest.advanceTimersByTime(followupWaitMarker))
    expect(followupTimeoutCallCount()).toBe(2)
    expect(followupTester).toHaveBeenCalledTimes(2)
  })

  test('report status is ordered by severity', () => {
    basicWaiterSetup()
    const uncheckedCheck = () => ({status : waiterStatus.UNCHECKED})
    const blockerCheck = () => ({status : waiterStatus.BLOCKED})

    const checks = [ resolvedCheck, blockerCheck, uncheckedCheck, waitingCheck ]
    let report
    const reportHandler = (r) => report = r
    render(
      <Waiter name="test" checks={checks} reportHandler={reportHandler}>
        { noOpChild }
      </Waiter>
    )
    expect(report.checksInfo).toHaveLength(4)
    expect(report.checksInfo[0].status).toBe(waiterStatus.UNCHECKED)
    expect(report.checksInfo[1].status).toBe(waiterStatus.BLOCKED)
    expect(report.checksInfo[2].status).toBe(waiterStatus.WAITING)
    expect(report.checksInfo[3].status).toBe(waiterStatus.RESOLVED)
  })

  test("alert issued by default if unresolved after 'followupWait'", () => {
    basicWaiterSetup()
    let report = null
    jest.spyOn(window, 'alert').mockImplementation((out) => report = out)

    render(
      <Waiter name="test" checks={[ waitingCheck ]} followupWait={1000}>
        { noOpChild }
      </Waiter>
    )
    expect(report).toBeNull()
    jest.advanceTimersByTime(500)
    expect(report).toBeNull()
    jest.advanceTimersByTime(500)
    expect(report).toBe('test is waiting.')
  })

  test("invokes 'reportHandler' only on initial run and when report changes", () => {
    basicWaiterSetup()
    const testHandler = jest.fn()
    const { rerender } = render(
      <Waiter name="test" checks={[ waitingCheck ]} reportHandler={testHandler} someProp={false}>
        { noOpChild }
      </Waiter>
    )
    expect(testHandler).toHaveBeenCalledTimes(1)

    rerender(
      <Waiter name="test" checks={[ waitingCheck ]} reportHandler={testHandler} someProp>
        { noOpChild }
      </Waiter>
    )
    expect(testHandler).toHaveBeenCalledTimes(1)

    rerender(
      <Waiter name="test" checks={[ resolvedCheck ]} reportHandler={testHandler} someProp>
        { noOpChild }
      </Waiter>
    )
    expect(testHandler).toHaveBeenCalledTimes(2)

    rerender(
      <Waiter name="test" checks={[ resolvedCheck ]} reportHandler={testHandler} someProp>
        { noOpChild }
      </Waiter>
    )
    expect(testHandler).toHaveBeenCalledTimes(2)
  })

  test('basic report renders multiple summaraies as an unordered list', () => {
    basicWaiterSetup()
    const checks = [
      () => ({ status : waiterStatus.WAITING, summary : "Waiting on foo..." }),
      () => ({ status : waiterStatus.WAITING, summary : "Waiting on bar..." })
    ]

    const { container } = render(
      <Waiter name="test" checks={checks}>
        { noOpChild }
      </Waiter>
    )

    expect(container.querySelectorAll('ul')).toHaveLength(1)
    expect(container.querySelectorAll('li')).toHaveLength(2)
  })

  test("throws error if 'checks' functions return invalid", () => {
    basicWaiterSetup()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => render(<Waiter checks={[() => true]}>{noOpChild}</Waiter>))
        .toThrow(new RegExp(msgs.badCheckReturn))
      expect(() => render(<Waiter checks={[() => ({ status : 'foo' })]}>{noOpChild}</Waiter>))
        .toThrow(/Use 'waiterStatus' constants/)
    }
    finally { console.error.mockRestore() } // eslint-disable-line no-console
  })

  test("recognize invalid 'checks' props", () => {
    let report
    jest.spyOn(console, 'error').mockImplementation((msg) => report = msg)
    try {
      let test = <Waiter>{noOpChild}</Waiter> //eslint-disable-line no-unused-vars
      expect(report).toMatch(new RegExp(msgs.checksRequirement))
      test = <Waiter checks={null}>{noOpChild}</Waiter>
      expect(report).toMatch(new RegExp(msgs.checksRequirement))
      test = <Waiter checks={[]}>{noOpChild}</Waiter>
      expect(report).toMatch(new RegExp(msgs.checksRequirement))
      test = <Waiter checks={['not a function']}>{noOpChild}</Waiter>
      expect(report).toMatch(new RegExp(msgs.checksRequirement))
    }
    finally { console.error.mockRestore() } // eslint-disable-line no-console
  })
})
