/**
 * Await will display the `spinner`, `blocked`, or `children` render props based
 * on results of running the `awaitChceks` functions, with a net result
 * 'waiting', 'blocked', or 'resolved' corresponding to each render prop.
 */
import React, { useEffect} from 'react'
import PropTypes from 'prop-types'

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
const defaultSpinner = (report) =>
  report === null
    ? 'Waiting...'
    : report.summaries.length === 0
      ? `${report.name} is ${awaitStatusToString[report.finalStatus].toLowerCase()}.`
      : report.summaries.length === 1
        ? `${report.name} ${report.summaries[0]}`
        : (<div>{`${report.name}:`}
          <ul>
            { report.summaries.map((summary) => (<li>{summary}</li>)) }
          </ul>
        </div>)

const defaultBlocked = defaultSpinner

/**
 * runReport executes the `checks` and assembles a final report object.
 */
const runReport = (name, checks, props) => {
  let finalStatus = awaitStatus.RESOLVED

  const checksInfo = checks.map((check) => {
    const checkInfo = check(props)
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

  let report = null
  useEffect(() => {
    report = runReport(name, checks, checkProps)

    if (reportHandler) reportHandler(report)

    let followupInterval = null
    if (followupHandler) {
      if (report.finalStatus !== awaitStatus.RESOLVED) {
        followupInterval = setInterval(() => followupHandler(report), followupWait)
      }
    }

    return () => {
      if (followupInterval !== null) clearInterval(followupInterval)
    }
  },
  [name, checks, reportHandler, followupHandler, followupWait, checkProps])

  // Pick the render prop to render.
  if (report !== null && report.finalStatus === awaitStatus.RESOLVED) {
    return typeof children === 'function' ? children(props) : children
  }
  else if (report === null || report.finalStatus === awaitStatus.WAITING) {
    return spinner(report)
  }
  else { // status is either BLOCKED or UNCHECKED
    return blocked(report)
  }
}

if (process.env.NODE_ENV !== 'production') {
  const checksValidator = (props, propName, componentName) => {
    if (!Array.isArray(props[propName])
        || props[propName].length === 0
        || !props[propName].every((i) => typeof i === "function")) {
      return new Error(`${propName} must be an array of at least one function.`);
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
  awaitStatusToString
}
