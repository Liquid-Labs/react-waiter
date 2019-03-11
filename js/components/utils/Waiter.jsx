/**
 * Waiter will display the `spinner`, `blocker`, or `children` render props based
 * on results of running the `waiterChceks` functions, with a net result
 * 'waiting', 'blocker', or 'resolved' corresponding to each render prop.
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
import * as waiterSettings from '../../settings/settings'
import { waiterStatus } from '../../utils/status'
import * as msgs from '../msgs'

/**
 * runReport executes the `checks` and assembles a final report object.
 */
const runReport = (name, checks, props) => {
  let finalStatus = waiterStatus.RESOLVED
  const errorMessages = []

  const checksInfo = checks.map((check) => {
    const checkInfo = check(props)
    if (process.env.NODE_ENV !== 'production') {
      if (typeof checkInfo !== 'object') {
        throw new Error(msgs.badCheckReturn)
      }
      else if (checkInfo.status !== waiterStatus.RESOLVED
               && checkInfo.status !== waiterStatus.WAITING
               && checkInfo.status !== waiterStatus.BLOCKED
               && checkInfo.status !== waiterStatus.UNCHECKED) {
        throw new Error(`Waiter 'checks' function had unexpected status '${checkInfo.status}'. Use 'waiterStatus' constants.`)
      }
    }

    // calculate the 'finalStatus' for the checks as a group.
    if (checkInfo.status === waiterStatus.BLOCKED
        && checkInfo.errorMessage === undefined
        && checkInfo.summary) {
      checkInfo.errorMessage = `${name} ${checkInfo.summary}`
    }
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

const Waiter = ({
  name, checks, checkProps, tiny=false,
  spinner, blocker,
  followupHandler, followupWait, followupMax,
  reportHandler,
  children, ...props}) => {
  // set defaults from settings for unset options
  const Spinner = spinner || waiterSettings.getDefaultSpinner()
  const Blocker = blocker || waiterSettings.getDefaultBlocker()
  reportHandler = reportHandler || waiterSettings.getDefaultReportHandler()
  followupHandler = followupHandler || waiterSettings.getDefaultFollowupHandler()
  followupWait = followupWait !== undefined
    ? followupWait
    : waiterSettings.getDefaultFollowupWait()
  followupMax = followupMax !== undefined
    ? followupMax
    : waiterSettings.getDefaultFollowupMax()

  if (process.env.NODE_ENV !== 'production') {
    if (!Spinner) throw new Error("No 'spinner' defined. Try 'waiterSettings.setDefaultSpinner(...)' or 'basicWaiterSetup()'.")
    if (!Blocker) throw new Error("No 'blocker' defined. Try 'waiterSettings.setDefaultSpinner(...)' or 'basicWaiterSetup().'")
  }

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
        && report.finalStatus !== waiterStatus.RESOLVED
        && followupCount < followupMax) {
      if (report.finalStatus === waiterStatus.BLOCKED) {
        followupHandler(report, followupCount+1, followupCount+1)
      }
      else {
        const followupTimeout = setTimeout(() => {
          followupHandler(report, followupCount+1, followupMax)
          // this will trigger the next followup, until followupMax
          setFollowupCount(followupCount + 1)
        },
        followupWait)
        return () => clearTimeout(followupTimeout)
      }
    }
  },
  [name, checks, reportHandler, followupCount, followupHandler, followupMax, followupWait, checkProps])
  // Pick the render prop to render.
  if (report !== null
      && report.finalStatus === waiterStatus.RESOLVED) {
    return typeof children === 'function' ? children(props) : children
  }
  else if (report !== null
           && (report.finalStatus === waiterStatus.WAITING
               || report.finalStatus === waiterStatus.UNCHECKED)) {
    return (<Spinner report={report} tiny={tiny} />)
  }
  else { // status is either BLOCKED or reports are both null (bad checks)
    return (<Blocker report={report} tiny={tiny} />)
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
  Waiter.propTypes = {
    blocker         : PropTypes.node,
    checks          : checksValidator,
    checkProps      : PropTypes.any,
    children        : PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
    followupHandler : PropTypes.func,
    followupMax     : PropTypes.number,
    followupWait    : PropTypes.number,
    reportHandler   : PropTypes.func,
    spinner         : PropTypes.node,
    tiny            : PropTypes.bool,
  }
}

export { Waiter }
