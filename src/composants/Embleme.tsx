import Box from '@mui/material/Box'

// Lauburu (croix basque) : quatre têtes en virgule, tournées d'un quart de tour.
export function Lauburu({ taille = 16, couleur = 'currentColor' }: { taille?: number, couleur?: string }) {
  const tete = 'M0 0 A1 1 0 0 1 0 -2 A0.5 0.5 0 0 1 0 -1 A0.5 0.5 0 0 0 0 0 Z'
  return (
    <svg width={taille} height={taille} viewBox="-2.1 -2.1 4.2 4.2" aria-hidden="true">
      {[0, 90, 180, 270].map((a) => <path key={a} d={tete} fill={couleur} transform={`rotate(${a})`} />)}
    </svg>
  )
}

// Monogramme du club.
export function Logo({ taille = '1.25rem' }: { taille?: string }) {
  return (
    <Box component="span" aria-label="JaXaJ MC" sx={{ fontWeight: 900, letterSpacing: '.02em', fontSize: taille, whiteSpace: 'nowrap', color: '#fff' }}>
      JaXaJ{' '}
      <Box component="span" sx={{ bgcolor: '#fff', color: '#000', px: '.3em', borderRadius: '3px', fontSize: '.88em' }}>MC</Box>
    </Box>
  )
}
