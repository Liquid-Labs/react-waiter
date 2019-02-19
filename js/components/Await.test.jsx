/* global afterEach, describe, expect, jest, test */
import React from 'react'
import { cleanup, render, queryAllBy } from 'react-testing-library'

import { Await, awaitStatus } from './Await'
import * as msgs from './msgs'

const waitingCheck = () => ({ status : awaitStatus.WAITING })
const resolvedCheck = () => ({ status : awaitStatus.RESOLVED })
const blockedCheck = () => ({ status : awaitStatus.BLOCKED })
const noOpChild = jest.fn(() => null)
const testSpinner = jest.fn(() => null)
const testBlocked = jest.fn(() => null)
const spinnerAndBlocked = {
  spinner : testSpinner,
  blocked : testBlocked
}
const expectChildSpinnerBlocked = (childN, spinnerN, blockedN) => {
  expect(noOpChild).toHaveBeenCalledTimes(childN)
  expect(testSpinner).toHaveBeenCalledTimes(spinnerN)
  expect(testBlocked).toHaveBeenCalledTimes(blockedN)
}

describe('Await', () => {
  jest.useFakeTimers()
  // Without the cleanup, you can see strang effects, like the 'getByTestId' in
  // the "can render [a function|alement]" tests are entangled. It seems
  // react-testing-library uses the same DOM for subsequent tests.
  afterEach(cleanup)

  test("can render a function child", () => {
    const content = "I'm from a func!"
    const { getByTestId } = render(
      <Await name="test" checks={[ resolvedCheck ]}>
        { () => <span data-testid="content">{content}</span> }
      </Await>
    )
    expect(getByTestId('content').textContent).toBe(content)
  })

  test("can render element children", () => {
    const content = "I'm from an element!"
    const { getByTestId } = render(
      <Await name="test" checks={[ resolvedCheck ]}>
        <span data-testid="content">{content}</span>
      </Await>
    )
    expect(getByTestId('content').textContent).toBe(content)
  })

  test('renders the spinner function once on initially unresolved render', () => {
    render(
      <Await name="test" {...spinnerAndBlocked} checks={[ waitingCheck ]}>
        {noOpChild}
      </Await>
    )
    // Note that since react-testing-library wraps the 'render' with 'act',
    // enqued effects are guaranteed to run before exiting the render, so this
    // is a good test in-so-far as it's waiting on the 'useEffect' and not just
    // racing with the initial render.
    expectChildSpinnerBlocked(0, 1, 0)
  })

  test('renders blocker on initially blocked status', () => {
    render(
      <Await name="test" {...spinnerAndBlocked} checks={[ blockedCheck ]}>
        {noOpChild}
      </Await>
    )
    expectChildSpinnerBlocked(0, 0, 1)
  })

  test('transitions through all states cleanly', () => {
    const { rerender } = render(
      <Await name="test" {...spinnerAndBlocked} checks={[ waitingCheck ]}>
        {noOpChild}
      </Await>
    )
    expectChildSpinnerBlocked(0, 1, 0)

    rerender(
      <Await name="test" {...spinnerAndBlocked} checks={[ blockedCheck ]}>
        {noOpChild}
      </Await>
    )
    expectChildSpinnerBlocked(0, 1, 1)

    rerender(
      <Await name="test" {...spinnerAndBlocked} checks={[ resolvedCheck ]}>
        {noOpChild}
      </Await>
    )
    expectChildSpinnerBlocked(1, 1, 1)
  })

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

  test('report status is ordered by severity', () => {
    const uncheckedCheck = () => ({status : awaitStatus.UNCHECKED})
    const blockedCheck = () => ({status : awaitStatus.BLOCKED})

    const checks = [ resolvedCheck, blockedCheck, uncheckedCheck, waitingCheck ]
    let report
    const reportHandler = (r) => report = r
    render(
      <Await name="test" checks={checks} reportHandler={reportHandler}>
        { noOpChild }
      </Await>
    )
    expect(report.checksInfo).toHaveLength(4)
    expect(report.checksInfo[0].status).toBe(awaitStatus.UNCHECKED)
    expect(report.checksInfo[1].status).toBe(awaitStatus.BLOCKED)
    expect(report.checksInfo[2].status).toBe(awaitStatus.WAITING)
    expect(report.checksInfo[3].status).toBe(awaitStatus.RESOLVED)
  })

  test("default alert issued if unresolved after 'followupWait'", () => {
    let report = null
    jest.spyOn(window, 'alert').mockImplementation((out) => report = out)

    render(
      <Await name="test" checks={[ waitingCheck ]} followupWait={1000}>
        { noOpChild }
      </Await>
    )
    expect(report).toBeNull()
    jest.advanceTimersByTime(500)
    expect(report).toBeNull()
    jest.advanceTimersByTime(500)
    expect(report).toBe('test is waiting.')
  })

  test("invokes 'reportHandler' only on initial run and when report changes", () => {
    const testHandler = jest.fn()
    const { rerender } = render(
      <Await name="test" checks={[ waitingCheck ]} reportHandler={testHandler} someProp={false}>
        { noOpChild }
      </Await>
    )
    expect(testHandler).toHaveBeenCalledTimes(1)

    rerender(
      <Await name="test" checks={[ waitingCheck ]} reportHandler={testHandler} someProp>
        { noOpChild }
      </Await>
    )
    expect(testHandler).toHaveBeenCalledTimes(1)

    rerender(
      <Await name="test" checks={[ resolvedCheck ]} reportHandler={testHandler} someProp>
        { noOpChild }
      </Await>
    )
    expect(testHandler).toHaveBeenCalledTimes(2)

    rerender(
      <Await name="test" checks={[ resolvedCheck ]} reportHandler={testHandler} someProp>
        { noOpChild }
      </Await>
    )
    expect(testHandler).toHaveBeenCalledTimes(2)
  })

  test('default report renders multiple summaraies as an unordered list', () => {
    const checks = [
      () => ({ status : awaitStatus.WAITING, summary : "Waiting on foo..." }),
      () => ({ status : awaitStatus.WAITING, summary : "Waiting on bar..." })
    ]

    const { container } = render(
      <Await name="test" checks={checks}>
        { noOpChild }
      </Await>
    )

    expect(container.querySelectorAll('ul')).toHaveLength(1)
    expect(container.querySelectorAll('li')).toHaveLength(2)
  })

  test("throws error if 'checks' functions return invalid", () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => render(<Await checks={[() => true]}>{noOpChild}</Await>))
        .toThrow(new RegExp(msgs.badCheckReturn))
      expect(() => render(<Await checks={[() => ({ status : 'foo'})]}>{noOpChild}</Await>))
        .toThrow(/Use 'awaitStatus' constants/)
    }
    finally { console.error.mockRestore() }
  })

  test("recognize invalid 'checks' props", () => {
    let report
    jest.spyOn(console, 'error').mockImplementation((msg) => report = msg)
    try {
      let test = <Await>{noOpChild}</Await>
      expect(report).toMatch(new RegExp(msgs.checksRequirement))
      test = <Await checks={null}>{noOpChild}</Await>
      expect(report).toMatch(new RegExp(msgs.checksRequirement))
      test = <Await checks={[]}>{noOpChild}</Await>
      expect(report).toMatch(new RegExp(msgs.checksRequirement))
      test = <Await checks={['not a function']}>{noOpChild}</Await>
      expect(report).toMatch(new RegExp(msgs.checksRequirement))
    }
    finally { console.error.mockRestore() }
  })
})
