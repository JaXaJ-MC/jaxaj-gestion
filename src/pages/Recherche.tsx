import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { aLeDroit, api, ErreurApi } from '../api/client'
import { useReference } from '../api/reference'
import { dateFr, euros, type LigneListe } from '../api/types'
import { EtiquetteAssociation } from '../composants/Etiquette'
import { Surligne } from '../composants/Surligne'
import { correspond, termes } from '../texte'

type Filtre = 'tous' | 'en_cours' | 'a_payer'

const MOYENS = [
  { code: 'especes', libelle: 'Espèces' },
  { code: 'cheque', libelle: 'Chèque' },
  { code: 'virement', libelle: 'Virement' },
  { code: 'carte', libelle: 'Carte' },
]

const aPayer = (l: LigneListe) => l.mois.statut === 'a_payer' || l.mois.statut === 'partiel'

/**
 * Écran principal : la liste complète des personnes avec l'état du mois. La recherche filtre
 * la liste sur place et surligne ce qu'elle trouve ; « Payé ce mois-ci » encaisse le mois.
 */
export function Recherche() {
  const ref = useReference()
  const [params, setParams] = useSearchParams()
  const [saisie, setSaisie] = useState(params.get('q') ?? '')
  const [filtre, setFiltre] = useState<Filtre>((params.get('filtre') as Filtre) || 'tous')
  const [lignes, setLignes] = useState<LigneListe[] | null>(null)
  const [mois, setMois] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [choixMoyen, setChoixMoyen] = useState<string | null>(null)   // personne dont on choisit le moyen
  const [enCours, setEnCours] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'erreur', texte: string } | null>(null)
  const peutEncaisser = aLeDroit('membres', 'admin', 'gestion', 'accueil')

  useEffect(() => {
    api<{ mois: string, personnes: LigneListe[] }>('membres', '/api/liste')
      .then((r) => { setLignes(r.personnes); setMois(r.mois) })
      .catch((e) => setErreur(e.message))
  }, [])

  useEffect(() => {
    const q = saisie.trim()
    setParams({ ...(q ? { q } : {}), ...(filtre !== 'tous' ? { filtre } : {}) }, { replace: true })
  }, [saisie, filtre, setParams])

  const mots = useMemo(() => termes(saisie), [saisie])
  const comptes = useMemo(() => ({
    tous: lignes?.length ?? 0,
    en_cours: lignes?.filter((l) => l.adhesion).length ?? 0,
    a_payer: lignes?.filter(aPayer).length ?? 0,
  }), [lignes])
  const visibles = useMemo(() => (lignes ?? []).filter((l) =>
    (filtre === 'tous' || (filtre === 'en_cours' ? !!l.adhesion : aPayer(l)))
    && correspond([l.nom, l.prenom, l.surnom].filter(Boolean).join(' '), mots),
  ), [lignes, filtre, mots])

  async function encaisser(ligne: LigneListe, moyen: string) {
    setEnCours(ligne.id)
    setMessage(null)
    try {
      const nouvelle = await api<LigneListe>('membres', `/api/personnes/${ligne.id}/paiement-mois`, { methode: 'POST', corps: { mois, moyen } })
      setLignes((ls) => ls?.map((l) => (l.id === ligne.id ? nouvelle : l)) ?? null)
      setMessage({ type: 'ok', texte: `${[ligne.prenom, ligne.nom].filter(Boolean).join(' ')} : ${euros(ligne.mois.reste)} encaissés (${MOYENS.find((m) => m.code === moyen)?.libelle.toLowerCase()}).` })
    } catch (e) {
      setMessage({ type: 'erreur', texte: (e as ErreurApi).statut === 403 ? 'Vous n\'avez pas le droit d\'encaisser cette cotisation.' : (e as Error).message })
    } finally {
      setEnCours(null)
      setChoixMoyen(null)
    }
  }

  const nomMois = mois ? new Date(`${mois}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''
  const libelleCategorie = (code: string | null) => ref?.categories.find((c) => c.code === code)?.libelle ?? code
  const organisation = (id: string | null) => ref?.organisations.find((o) => o.id === id)

  return (
    <section>
      <div className="recherche">
        <input
          type="search"
          className="recherche-champ"
          placeholder="Filtrer : nom, prénom ou surnom…"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          aria-label="Filtrer la liste"
        />
        <div className="filtres" role="group" aria-label="Afficher">
          {([['tous', 'Tous'], ['en_cours', 'Adhésion en cours'], ['a_payer', `À payer en ${nomMois.split(' ')[0] || 'ce mois'}`]] as [Filtre, string][]).map(([f, libelle]) => (
            <button key={f} className={`filtre ${filtre === f ? 'actif' : ''}`} aria-pressed={filtre === f} onClick={() => setFiltre(f)}>
              {libelle} <span className="compte">{comptes[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {message && <p className={`bandeau ${message.type === 'ok' ? 'bandeau-ok' : 'bandeau-erreur'}`} role="status">{message.texte}</p>}
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      {!lignes && !erreur && <p className="aide">Chargement de la liste…</p>}

      {lignes && visibles.length === 0 && (
        <div className="carte vide">
          <p>Personne ne correspond{saisie ? ` à « ${saisie} »` : ''}.</p>
          <Link className="bouton bouton-principal" to={`/personnes/nouvelle?nom=${encodeURIComponent(saisie)}`}>Créer une fiche</Link>
        </div>
      )}

      {visibles.length > 0 && (
        <>
          <p className="aide resultat">{visibles.length === lignes?.length ? `${visibles.length} personnes` : `${visibles.length} sur ${lignes?.length}`} · {nomMois}</p>
          <ul className="liste">
            {visibles.map((l) => (
              <li key={l.id} className="liste-entree">
                <Link to={`/personnes/${l.id}`} className="liste-personne">
                  <span className="liste-nom">
                    <Surligne texte={[l.prenom, l.nom].filter(Boolean).join(' ')} mots={mots} />
                    {l.surnom && <span className="surnom"> « <Surligne texte={l.surnom} mots={mots} /> »</span>}
                  </span>
                  <span className="liste-infos">
                    {l.adhesion
                      ? <><EtiquetteAssociation organisation={organisation(l.association)} /> {libelleCategorie(l.categorie)}</>
                      : l.derniere_cotisation ? `Dernière cotisation : ${dateFr(l.derniere_cotisation).slice(3)}` : 'Aucune cotisation'}
                  </span>
                </Link>
                <div className="liste-action">
                  {l.mois.statut === 'paye' && <span className="statut statut-paye">✓ Payé</span>}
                  {l.mois.statut === 'gratuit' && <span className="statut statut-paye">Gratuit</span>}
                  {l.mois.statut === 'sans_tarif' && <span className="statut">Pas de tarif</span>}
                  {aPayer(l) && peutEncaisser && choixMoyen !== l.id && (
                    <button className="bouton bouton-principal bouton-petit" disabled={enCours === l.id} onClick={() => setChoixMoyen(l.id)}>
                      Payé ce mois-ci · {euros(l.mois.reste)}
                    </button>
                  )}
                  {aPayer(l) && choixMoyen === l.id && (
                    <div className="moyens" role="group" aria-label="Moyen de paiement">
                      {MOYENS.map((m) => (
                        <button key={m.code} className="bouton bouton-petit" disabled={enCours === l.id} onClick={() => encaisser(l, m.code)}>{m.libelle}</button>
                      ))}
                      <button className="bouton bouton-petit bouton-fermer" aria-label="Annuler" onClick={() => setChoixMoyen(null)}>✕</button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
