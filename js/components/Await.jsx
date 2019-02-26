/**
 * Await will display the `spinner`, `blocked`, or `children` render props based
 * on results of running the `awaitChceks` functions, with a net result
 * 'waiting', 'blocked', or 'resolved' corresponding to each render prop.
 *
 * `followupHandler` is invoked if the status effective status remains un-
 * resolved after `followupWait` miliseconds (defaults to 3000 == 3 seconds).
 *
 * The `checks` are run synchronously on every render cycle and so should be
 * fast. This is done to keep the component simple while avoiding unecessary
 * re-renders that `useState` would entail. In future, we may provide a more
 * complicated alternate component that runs the checks asynchronously in
 * order to support expensive checks.
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

// Default handler invoked if
const defaultFollowupHandler = (report, followupCount, followupMax) =>
  window.alert(
    `${report.name} is ${awaitStatusToString[report.finalStatus].toLowerCase()}.`,
    report.summaries.join("\n\t"),
    followupCount < followupMax
      ? `Warning #${followupCount}.`
      : 'Last warning.')

// TODO: colorize the report
const defaultReportDisplay = (report) =>
  report.summaries.length === 0
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
  const errorMessages = []

  const checksInfo = checks.map((check) => {
    const checkInfo = check(props)
    if (process.env.NODE_ENV !== 'production') {
      if (typeof checkInfo !== 'object') {
        throw new Error(msgs.badCheckReturn)
      }
      else if (checkInfo.status !== awaitStatus.RESOLVED
               && checkInfo.status !== awaitStatus.WAITING
               && checkInfo.status !== awaitStatus.BLOCKED
               && checkInfo.status !== awaitStatus.UNCHECKED) {
        throw new Error(`Await 'checks' function had unexpected status '${checkInfo.status}'. Use 'awaitStatus' constants.`)
      }
    }

    // calculate the 'finalStatus' for the checks as a group.
    if (checkInfo.status < finalStatus) finalStatus = checkInfo.status
    if (checkInfo.errorMessage) errorMessages.push(checkInfo.errorMessage)
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
    name         : name,
    finalStatus  : finalStatus,
    checksInfo   : checksInfo,
    summaries    : summaries,
    errorMessage : errorMessages.join("\n")
  }
}

const Await = ({
  name, checks, checkProps,
  spinner=defaultSpinner,
  blocked=defaultBlocked,
  reportHandler=null,
  followupHandler=defaultFollowupHandler,
  followupWait=3000,
  followupMax=3,
  children, ...props}) => {
  const report = runReport(name, checks, checkProps)
  const [ prevReport, setPrevReport ] = useState(report)
  const [ followupCount, setFollowupCount ] = useState(0)

  // Call the 'reportHandler' and 'followupHandler' as needed.
  useEffect(() => {
    const reportChanged = report !== prevReport && !isEqual(report, prevReport)

    if (reportHandler) {
      // first time through or report has changed
      if (report === prevReport || reportChanged) reportHandler(report)
      if (reportChanged) setPrevReport(report)
      // else, if no report handler, no reason to save the report and trigger
      // unecessary re-render
    }

    if (followupHandler
        && report.finalStatus !== awaitStatus.RESOLVED
        && followupCount < followupMax) {
      const followupTimeout = setTimeout(() => {
        followupHandler(report, followupCount+1, followupMax)
        // this will trigger the next followup, until followupMax
        setFollowupCount(followupCount + 1)
      },
      followupWait)
      return () => clearTimeout(followupTimeout)
    }
  },
  [name, checks, reportHandler, followupCount, followupHandler, followupMax, followupWait, checkProps])
  // Pick the render prop to render.
  if (report !== null
      && report.finalStatus === awaitStatus.RESOLVED) {
    return typeof children === 'function' ? children(props) : children
  }
  else if (report !== null
           && (report.finalStatus === awaitStatus.WAITING
               || report.finalStatus === awaitStatus.UNCHECKED)) {
    return spinner(report)
  }
  else { // status is either BLOCKED or reports are both null (bad checks)
    return blocked(report)
  }
}

/* istanbul ignore next */ // TODO: seems to have no effect
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
