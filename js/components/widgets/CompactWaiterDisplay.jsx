import { waiterStatusToString } from '../../utils/status'

// TODO: colorize the report
const CompactWaiterDisplay = ({report}) =>
  report.summaries.length === 0
    ? `${report.name} is ${waiterStatusToString[report.finalStatus].toLowerCase()}.`
    : report.summaries[0]

export { CompactWaiterDisplay }
