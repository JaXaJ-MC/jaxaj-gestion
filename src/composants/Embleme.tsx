// Lauburu (croix basque) : quatre têtes en virgule, tournées d'un quart de tour.
export function Lauburu({ taille = 16, couleur = 'currentColor' }: { taille?: number, couleur?: string }) {
  const tete = 'M0 0 A1 1 0 0 1 0 -2 A0.5 0.5 0 0 1 0 -1 A0.5 0.5 0 0 0 0 0 Z'
  return (
    <svg width={taille} height={taille} viewBox="-2.1 -2.1 4.2 4.2" aria-hidden="true">
      {[0, 90, 180, 270].map((a) => <path key={a} d={tete} fill={couleur} transform={`rotate(${a})`} />)}
    </svg>
  )
}

// Monogramme du club pour l'en-tête.
export function Logo() {
  return (
    <span className="logo" aria-label="JaXaJ MC">
      <span className="logo-x">JaXaJ</span> <span className="logo-mc">MC</span>
    </span>
  )
}
