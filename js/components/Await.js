import PropTypes from 'prop-types'

import { useAwait } from '../hooks/useAwait'
import { awaitStatus } from '../awaitStatus'

const Await = ({awaitChecks, awaitConf, spinner, blocked, children}) => {
  const report = useAwait(awaitChecks, awaitConf)

  if (report.finalStatus === awaitStatus.RESOLVED) {
    return children()
  }
  else if (report.finalStatus === awaitStatus.WAITING) {
    return spinner()
  }
  else { // status is either BLOCKED or UNCHECKED
    return blocked()
  }
}

Await.propTypes = {
  blocked  : PropTypes.func.isRequired,
  children : PropTypes.func.isRequired,
  spinner  : PropTypes.func.isRequired
}

export {
  Await
}
