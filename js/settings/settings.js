import { waiterStatusToString } from '../utils/status'

// We could save a few bytes when the 'followupHandler' is overriden, but it
// provides very useful and would be easy to miss if not set, so we include it
// in the initial setup.
const basicFollowupHandler = (report, followupCount, followupMax) =>
  window.alert(
    `${report.name} is ${waiterStatusToString[report.finalStatus].toLowerCase()}.`,
    report.summaries.join("\n\t"),
    followupCount < followupMax
      ? `Warning #${followupCount}.`
      : 'Last warning.')

const initialSettings = {
  defaultSpinner         : null,
  defaultBlocker         : null,
  defaultFollowupHandler : basicFollowupHandler,
  defaultFollowupWait    : 3000,
  defaultFollowupMax     : 3,
  defaultReportHandler   : null,
}

const settings = Object.assign({}, initialSettings)

const setDefaultSpinner = (component) => settings.defaultSpinner = component
const getDefaultSpinner = () => settings.defaultSpinner

const setDefaultBlocker = (component) => settings.defaultBlocker = component
const getDefaultBlocker = () => settings.defaultBlocker

const setDefaultFollowupHandler = (func) =>
  settings.defaultFollowupHandler = func
const getDefaultFollowupHandler = () => settings.defaultFollowupHandler

const setDefaultFollowupWait = (ms) => settings.defaultFollowupWait = ms
const getDefaultFollowupWait = () => settings.defaultFollowupWait

const setDefaultFollowupMax = (count) => settings.defaultFollowupMax = count
const getDefaultFollowupMax = () => settings.defaultFollowupMax

const setDefaultReportHandler = (func) =>
  settings.setDefaultReportHandler = func
const getDefaultReportHandler = () => settings.defaultReportHandler

const reset = () => Object.assign(settings, initialSettings)

export {
  setDefaultSpinner,
  getDefaultSpinner,
  setDefaultBlocker,
  getDefaultBlocker,
  setDefaultFollowupHandler,
  getDefaultFollowupHandler,
  setDefaultFollowupWait,
  getDefaultFollowupWait,
  setDefaultFollowupMax,
  getDefaultFollowupMax,
  setDefaultReportHandler,
  getDefaultReportHandler,
  reset
}
