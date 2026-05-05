import { useSystemSetting } from '../../hooks/useSystemSettings'

export const BrandBadge = () => {
  const { value: appLogo } = useSystemSetting('app_logo', '/EVGo-Logo.png')
  
  return (
    <div className="relative flex justify-center">
      <div className="relative">
        <div className="flex h-36 w-36 items-center justify-center overflow-hidden sm:h-28 sm:w-28 sm:rounded-[2rem]">
          <img
            src={appLogo || '/EVGo-Logo.png'}
            alt="EVGo Logo"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    </div>
  )
}


