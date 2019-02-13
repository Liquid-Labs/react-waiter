import { useState, useEffect } from 'react'
import { awaitStatus } from '../awaitStatus'

const defaultCheckWait = 3000 //ms = 3 seconds

const checkAwaits = (awaitChecks) =>
  awaitChecks && awaitChecks.length > 0 // there are awaitChecks
    && awaitChecks.map((check) => check()).sort((a, b) =>
      a.status < b.status ? -1 : a.status > b.status ? 1 : 0 ) // ascending sort

const extractStatus = (status) =>
  status & awaitStatus.BLOCKED
  || status & awaitStatus.WAITING
  || status & awaitStatus.RESOLVED
  || awaitStatus.UNCHECKED

const statusToString = {
  [awaitStatus.UNCHECKED] : 'Unchecked',
  [awaitStatus.BLOCKED]   : 'Blocked',
  [awaitStatus.WAITING]   : 'Waiting',
  [awaitStatus.RESOLVED]  : 'Resolved'
}

const finalizeReport = (statusInfo) => {
  const finalStatus = extractStatus(
    statusInfo.reduce((acc, statInfo) => acc |= statInfo.status, 0))

  return {
    finalStatus : finalStatus,
    statusInfo  : statusInfo
  }
}

const awaitReportToStrings = ({ finalStatus, statusInfo }, name) => {
  const checkSummaries = statusInfo.map((statInfo =>
    statInfo.summary
      ? `${statusToString[statInfo.status]}: ${statInfo.summary}`
      : null)).filter((summary) => summary !== null)

  checkSummaries.unshift(`${name} is ${statusToString[finalStatus].toLowerCase()}.`)

  return checkSummaries
}

const useAwait = (awaitChecks, config={}) => {
  // set defaults
  if (config.checkWait === undefined) config.checkWait = defaultCheckWait
  if (config.name === undefined) config.name = 'Unamed await'
  if (config.checkResponse === undefined) {
    config.checkResponse = (awaitReport, {description}) => {
      if (awaitReport.finalStatus !== awaitStatus.RESOLVED) {
        window.alert(awaitReportToStrings(awaitReport, config.name).join("\n"))
      }
    }
  }

  const { checkWait, checkResponse } = config
  const [longWaitCheck, setLongWaitCheck] = useState(null)

  const statusInfo = checkAwaits(awaitChecks) || []
  const awaitReport = finalizeReport(statusInfo)
  awaitReport.description = awaitReportToStrings(awaitReport, config.name)

  if (longWaitCheck === null
      && awaitReport.finalStatus !== awaitStatus.RESOLVED) {
    setLongWaitCheck(setInterval(() => checkResponse(awaitReport, config), checkWait))
  }
  else if (longWaitCheck !== null
           && awaitReport.finalStatus === awaitStatus.RESOLVED) {
    clearInterval(longWaitCheck)
    setLongWaitCheck(null)
  }
  // We also need to clean up the interval if unmounted.
  useEffect(() => {
    return () => {
      if (longWaitCheck !== null) {
        clearInterval(longWaitCheck)
      }
    }
  }, [])

  return awaitReport
}

export {
  useAwait,
}
