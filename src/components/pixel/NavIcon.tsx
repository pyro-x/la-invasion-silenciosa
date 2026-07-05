import { MiniPix } from './PixelSprite'
import { NAV_ICONS, type NavIconName } from './sprites'

/** Bottom-bar icon; inherits the tab's text color (prototype NavIcon). */
export function NavIcon({ name, scale = 3.4 }: { name: NavIconName; scale?: number }) {
  return <MiniPix grid={NAV_ICONS[name]} scale={scale} />
}
