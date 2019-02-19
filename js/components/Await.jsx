/**
 * Await will display the `spinner`, `blocked`, or `children` render props based
 * on results of running the `awaitChceks` functions, with a net result
 * 'waiting', 'blocked', or 'resolved' corresponding to each render prop.
 */
import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import isEqual from 'lodash.isequal'
import * as msgs from './msgs'

// The stati are powers of 2 so we can bit-or them.
const awaitStatus = {
  UNCHECKED : 0,
  BLOCKED   : 1,
  WAITING   : 2,
  RESOLVED  : 4,
}

const awaitStatusToString = {
  [awaitStatus.UNCHECKED] : 'Unchecked',
  [awaitStatus.BLOCKED]   : 'Blocked',
  [awaitStatus.WAITING]   : 'Waiting',
  [awaitStatus.RESOLVED]  : 'Resolved'
}

const defaultFollowupHandler = (report) => {
  if (report.finalStatus !== awaitStatus.RESOLVED) {
    window.alert(`${report.name} is ${awaitStatusToString[report.finalStatus].toLowerCase()}.`,
      report.summaries.join("\n\t"))
  }
}

const defaultFollowupWait = 3000 //ms = 3 seconds

const defaultReportHandler = null

// TODO: colorize the report
const defaultReportDisplay = (report) =>
  report === null
    ? 'Waiting...'
    : report.summaries.length === 0
      ? `${report.name} is ${awaitStatusToString[report.finalStatus].toLowerCase()}.`
      : report.summaries.length === 1
        ? `${report.name} ${report.summaries[0]}`
        : (<div>{`${report.name}:`}
          <ul>
            { report.summaries.map((summary) => (<li key={summary}>{summary}</li>)) }
          </ul>
        </div>)

const defaultSpinner = defaultReportDisplay
const defaultBlocked = defaultReportDisplay

/**
 * runReport executes the `checks` and assembles a final report object.
 */
const runReport = (name, checks, props) => {
  let finalStatus = awaitStatus.RESOLVED

  const checksInfo = checks.map((check) => {
    const checkInfo = check(props)
    if (process.env.NODE_ENV !== 'production') {
      if (typeof checkInfo !== 'object') {
        throw new Error(msgs.badCheckReturn)
      }
      else if (checkInfo.status !== awaitStatus.RESOLVED &&
               checkInfo.status !== awaitStatus.WAITING &&
               checkInfo.status !== awaitStatus.BLOCKED &&
               checkInfo.status !== awaitStatus.UNCHECKED) {
        throw new Error(`Await 'checks' function had unexpected status '${checkInfo.status}'. Use 'awaitStatus' constants.`)
      }
    }

    if (checkInfo.status < finalStatus) finalStatus = checkInfo.status
    return checkInfo
  })
    .sort((a, b) =>
      a.status < b.status ? -1 : a.status > b.status ? 1 : 0 ) // ascending sort
  // notice the summaries are processed seperately so they'll end up sorted as
  // well
  const summaries = checksInfo.map((checkInfo) =>
      checkInfo.summary ? checkInfo.summary : null
    )
    .filter((summary) => summary !== null)

  return {
    name        : name,
    finalStatus : finalStatus,
    checksInfo  : checksInfo,
    summaries   : summaries
  }
}

const Await = ({
  name, checks, checkProps, spinner, blocked, reportHandler, followupHandler, followupWait,
  children, ...props}) => {
  // set default for optional properties
  if (spinner === undefined) spinner = defaultSpinner
  if (blocked === undefined) blocked = defaultBlocked
  if (followupHandler === undefined) followupHandler = defaultFollowupHandler
  if (followupWait === undefined) followupWait = defaultFollowupWait
  if (reportHandler === undefined) reportHandler = defaultReportHandler

  // We could run the report on every render and avoid soving it to state, but
  // this way we can avoid re-running in some cases when it it's not necessary
  // (like when the 'props' but not 'checkProps' are changed).
  const [ report, setReport ] = useState(null)
  // The 'initialReport' allows us to provide a report in the first render as
  // the report generated in the following 'useEffect' is created post first
  // render. This avoids 'blinking content'.
  const initialReport = report === null ? runReport(name, checks, checkProps) : null

  useEffect(() => {
    const newReport = runReport(name, checks, checkProps)
    if ((report !== null && !isEqual(report, newReport))
        || (initialReport !== null && !isEqual(initialReport, newReport))) {
      setReport(newReport)
    }
    if (reportHandler) reportHandler(newReport)

    let followupInterval = null
    if (followupHandler) {
      if (newReport && newReport.finalStatus !== awaitStatus.RESOLVED) {
        followupInterval = setInterval(() => followupHandler(newReport), followupWait)
      }
    }

    return () => {
      if (followupInterval !== null) clearInterval(followupInterval)
    }
  },
  [name, checks, reportHandler, followupHandler, followupWait, checkProps])

  // Pick the render prop to render.
  // TODO: '(initialReport || report)' should NEVER be null. If so, then that's
  // a program error and should raise an excption or something.
  if ((initialReport || report) !== null
      && (initialReport || report).finalStatus === awaitStatus.RESOLVED) {
    return typeof children === 'function' ? children(props) : children
  }
  else if ((initialReport || report) !== null
           && ((initialReport || report).finalStatus === awaitStatus.WAITING
               || (initialReport || report).finalStatus === awaitStatus.UNCHECKED)) {
    return spinner(initialReport || report)
  }
  else { // status is either BLOCKED or reports are both null (bad checks)
    return blocked(initialReport || report)
  }
}

if (process.env.NODE_ENV !== 'production') {
  const checksValidator = (props, propName, componentName) => {
    if (!Array.isArray(props[propName])
        || props[propName].length === 0
        || props[propName].some((i) => typeof i !== 'function')) {
      return new Error(`${propName} ${msgs.checksRequirement}`);
    }
  }
  Await.propTypes = {
    blocked       : PropTypes.func,
    checks        : checksValidator,
    checkProps    : PropTypes.any,
    children      : PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
    followupWait  : PropTypes.number,
    reportHandler : PropTypes.func,
    spinner       : PropTypes.func
  }
}

export {
  Await,
  awaitStatus,
  awaitStatusToString,
  defaultReportDisplay
}
