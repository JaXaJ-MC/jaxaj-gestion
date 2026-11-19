import { useId, type ReactNode } from 'react'

/**
 * Champ de date avec son étiquette À CÔTÉ, reliée par un identifiant. Placé à l'intérieur d'un
 * <label>, le calendrier natif se referme dès que la souris passe dessus (Firefox, Safari) :
 * les événements du calendrier sont pris pour une activation de l'étiquette.
 */
export function ChampDate({ libelle, valeur, changer, requis = false, aide }: {
  libelle: string, valeur: string, changer: (v: string) => void, requis?: boolean, aide?: ReactNode
}) {
  const id = useId()
  return (
    <div className="champ">
      <label htmlFor={id}>{libelle}</label>
      <input id={id} type="date" value={valeur} onChange={(e) => changer(e.target.value)} required={requis} />
      {aide}
    </div>
  )
}
