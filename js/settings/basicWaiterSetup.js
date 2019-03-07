import { BasicWaiterDisplay } from '../components/widgets/BasicWaiterDisplay'

import * as waiterSettings from './settings'

const basicWaiterSetup = () => {
  waiterSettings.setDefaultSpinner(BasicWaiterDisplay)
  waiterSettings.setDefaultBlocker(BasicWaiterDisplay)
}

export { basicWaiterSetup }
