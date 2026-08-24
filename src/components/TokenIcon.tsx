import type { Token } from '../utils/constants'

type TokenIconProps = {
  token: Token
  size?: 'small' | 'medium'
}

export function TokenIcon({ token, size = 'small' }: TokenIconProps) {
  return (
    <img
      alt={`${token.name} logo`}
      className={size === 'medium' ? 'h-[30px] w-[30px] shrink-0 rounded-full object-cover' : 'h-[18px] w-[18px] shrink-0 rounded-full object-cover'}
      src={token.logo}
    />
  )
}
