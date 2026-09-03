import Printer3D from './Printer3D'
import VisaKiosk3D from './VisaKiosk3D'
import Camera3D from './Camera3D'
import Motorcycle3D from './Motorcycle3D'
import POSTerminal3D from './POSTerminal3D'
import CapsulePuck3D from './CapsulePuck3D'
import SliderPanel3D from './SliderPanel3D'
import TutorBot3D from './TutorBot3D'

export interface ObjectProps {
  accent: string
  hovered: boolean
}

export const OBJECT_COMPONENTS: Record<string, React.ComponentType<ObjectProps>> = {
  Printer3D,
  VisaKiosk3D,
  Camera3D,
  Motorcycle3D,
  POSTerminal3D,
  CapsulePuck3D,
  SliderPanel3D,
  TutorBot3D
}
