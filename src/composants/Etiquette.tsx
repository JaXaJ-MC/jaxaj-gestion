import type { Organisation } from '../api/types'
import { Lauburu } from './Embleme'

// Étiquette d'association aux couleurs de la charte : la mère (Club) noire, Productions
// blanche (l'inverse du Club), Euskadi rouge-vert-blanc avec le lauburu, Béarn jaune-rouge-bleu.
export function styleAssociation(nom: string): string {
  if (/euskadi/i.test(nom)) return 'asso-euskadi'
  if (/b[ée]arn/i.test(nom)) return 'asso-bearn'
  if (/production/i.test(nom)) return 'asso-productions'
  if (/^jaxaj mc$/i.test(nom)) return 'asso-club'
  return 'asso-autre'
}

export function EtiquetteAssociation({ organisation }: { organisation?: Organisation }) {
  if (!organisation) return null
  const style = styleAssociation(organisation.nom)
  return (
    <span className={`etiquette ${style}`}>
      {style === 'asso-euskadi' && <Lauburu taille={12} />}
      {organisation.nom}
    </span>
  )
}
