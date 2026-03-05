import { Link } from 'react-router-dom'

type AuthFooterProps = {
  prompt: string
  linkTo: string
  linkLabel: string
}

export const AuthFooter = ({ prompt, linkTo, linkLabel }: AuthFooterProps) => (
  <div className="mt-6 text-center text-sm text-slate-500">
    <span>{prompt} </span>
    <Link className="font-semibold text-sky-600 transition-colors hover:text-sky-500" to={linkTo}>
      {linkLabel}
    </Link>
  </div>
)


