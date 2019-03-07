import React from 'react'

import { waiterStatusToString } from '../../utils/status'

// TODO: colorize the report
const BasicWaiterDisplay = ({report}) =>
  report.summaries.length === 0
    ? `${report.name} is ${waiterStatusToString[report.finalStatus].toLowerCase()}.`
    : report.summaries.length === 1
      ? `${report.name} ${report.summaries[0]}`
      : (<div>{`${report.name}:`}
        <ul>
          { report.summaries.map((summary) => (<li key={summary}>{summary}</li>)) }
        </ul>
      </div>)

export { BasicWaiterDisplay }
