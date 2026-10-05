type Props = { variant?: 'header' | 'footer' | 'preloader'; className?: string }

export function OsgardLogo({ variant = 'header', className = '' }: Props) {
  return <svg className={`osgard-logo osgard-logo-${variant} ${className}`} viewBox="0 0 270 58" role="img" aria-label="OSGARD WORLD">
    <g className="osgard-logo-mark" aria-hidden="true">
      <circle className="osgard-logo-mark-orbit" cx="20" cy="21" r="16" />
      <path className="osgard-logo-mark-star" d="M20 6l2.6 10.4L33 14l-8.4 7.2L33 28l-10.4-2.6L20 36l-2.6-10.6L7 28l8.4-6.8L7 14l10.4 2.4L20 6Z" />
      <circle className="osgard-logo-mark-core" cx="20" cy="21" r="2.4" />
      <path className="osgard-logo-mark-ray" d="M20 1v4M20 37v4M0 21h4M36 21h4" />
    </g>
    <text className="osgard-logo-name" x="43" y="27">OSGARD</text>
    <text className="osgard-logo-world" x="44" y="41">WORLD</text>
  </svg>
}
