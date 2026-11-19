import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { aLeDroit, api, ErreurApi } from '../api/client'
import type { Personne } from '../api/types'
import { ChampDate } from '../composants/ChampDate'

interface Champs {
  nom: string, prenom: string, surnom: string, dateNaissance: string, telephone: string, email: string,
  ligne1: string, code_postal: string, ville: string, pays: string, commentaire: string
}

const vide: Champs = { nom: '', prenom: '', surnom: '', dateNaissance: '', telephone: '', email: '',
  ligne1: '', code_postal: '', ville: '', pays: 'FR', commentaire: '' }

/** Création (/personnes/nouvelle) ou modification (/personnes/:id/modifier) d'une fiche. */
export function FormulairePersonne() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [champs, setChamps] = useState<Champs>({ ...vide, nom: params.get('nom') ?? '' })
  // L'accueil ne voit ni ne modifie les coordonnées existantes ; à la création, il peut les saisir.
  const detail = !id || aLeDroit('membres', 'admin', 'gestion')
  const [erreur, setErreur] = useState<ErreurApi | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    if (!id) return
    api<Personne>('membres', `/api/personnes/${id}`).then((p) => {
      setChamps({
        nom: p.nom, prenom: p.prenom ?? '', surnom: p.surnom ?? '', dateNaissance: p.dateNaissance?.slice(0, 10) ?? '',
        telephone: p.telephone ?? '', email: p.email ?? '', commentaire: p.commentaire ?? '',
        ligne1: p.adresse?.ligne1 ?? '', code_postal: p.adresse?.code_postal ?? '', ville: p.adresse?.ville ?? '', pays: p.adresse?.pays ?? 'FR',
      })
    }).catch((e) => setErreur(e))
  }, [id])

  const champ = (nom: keyof Champs) => ({
    value: champs[nom],
    onChange: (e: { target: { value: string } }) => setChamps((c) => ({ ...c, [nom]: e.target.value })),
  })

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    const n = (v: string) => v.trim() || null
    const corps: Record<string, unknown> = { nom: champs.nom.trim(), prenom: n(champs.prenom), surnom: n(champs.surnom) }
    if (detail) {
      Object.assign(corps, {
        dateNaissance: n(champs.dateNaissance), telephone: n(champs.telephone), email: n(champs.email), commentaire: n(champs.commentaire),
        adresse: champs.ligne1 || champs.ville || champs.code_postal
          ? { ligne1: n(champs.ligne1), code_postal: n(champs.code_postal), ville: n(champs.ville), pays: champs.pays.toUpperCase() || 'FR' }
          : null,
      })
    }
    try {
      const p = await api<Personne>('membres', id ? `/api/personnes/${id}` : '/api/personnes', { methode: id ? 'PATCH' : 'POST', corps })
      naviguer(`/personnes/${p.id}`)
    } catch (err) {
      setErreur(err as ErreurApi)
    } finally {
      setEnvoi(false)
    }
  }

  const aide = (cle: string) => erreur?.details[cle] && <span className="erreur-champ">{erreur.details[cle]}</span>

  return (
    <section>
      <h1>{id ? 'Modifier la fiche' : 'Nouvelle fiche'}</h1>
      <form className="carte formulaire" onSubmit={soumettre}>
        <div className="grille">
          <label>Nom *<input {...champ('nom')} required autoFocus />{aide('nom')}</label>
          <label>Prénom<input {...champ('prenom')} />{aide('prenom')}</label>
          <label>Surnom (nom de route)<input {...champ('surnom')} />{aide('surnom')}</label>
        </div>
        {detail && (
          <>
            <div className="grille">
              <ChampDate libelle="Date de naissance" valeur={champs.dateNaissance} changer={(v) => setChamps((c) => ({ ...c, dateNaissance: v }))} aide={aide('dateNaissance')} />
              <label>Téléphone<input type="tel" {...champ('telephone')} />{aide('telephone')}</label>
              <label>E-mail<input type="email" {...champ('email')} />{aide('email')}</label>
            </div>
            <label>Adresse<input {...champ('ligne1')} />{aide('adresse')}</label>
            <div className="grille">
              <label>Code postal<input {...champ('code_postal')} inputMode="numeric" /></label>
              <label>Ville<input {...champ('ville')} /></label>
              <label>Pays (code)<input {...champ('pays')} maxLength={2} /></label>
            </div>
            <label>Commentaire<textarea rows={3} {...champ('commentaire')} /></label>
          </>
        )}
        {erreur && !Object.keys(erreur.details).length && <p className="erreur" role="alert">{erreur.message}</p>}
        <div className="actions">
          <button type="button" className="bouton" onClick={() => naviguer(-1)}>Annuler</button>
          <button className="bouton bouton-principal" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </section>
  )
}
