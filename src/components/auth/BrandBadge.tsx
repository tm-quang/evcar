import { useSystemSetting } from '../../hooks/useSystemSettings'

export const BrandBadge = () => {
  const { value: appLogo } = useSystemSetting('app_logo', '/logo-nontext.png')
  
  return (
    <div className="relative flex justify-center">
      <div className="relative">
        <div className="flex h-36 w-36 items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105 sm:h-28 sm:w-28 sm:rounded-[2rem]">
          <img
            src={appLogo || '/logo-nontext.png'}
            alt="BoFin Logo"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    </div>
  )
}


