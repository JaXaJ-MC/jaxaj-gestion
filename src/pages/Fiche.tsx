import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { aLeDroit, api } from '../api/client'
import { useReference } from '../api/reference'
import { dateFr, idDe, nomComplet, periodeFr, telephoneFr, type Acces, type Adhesion, type Cotisation, type Personne } from '../api/types'
import { ActionsAdhesion } from '../composants/ActionsAdhesion'
import { BlocCompte } from '../composants/BlocCompte'
import { BlocRoles } from '../composants/BlocRoles'
import { EtiquetteAssociation } from '../composants/Etiquette'

export function Fiche() {
  const { id } = useParams()
  const ref = useReference()
  const [personne, setPersonne] = useState<Personne | null>(null)
  const [adhesions, setAdhesions] = useState<Adhesion[]>([])
  const [cotisations, setCotisations] = useState<Cotisation[]>([])
  const [acces, setAcces] = useState<Acces | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [aujourdhui] = useState(() => new Date().toISOString().slice(0, 10))

  const charger = useCallback(() => {
    Promise.all([
      api<Personne>('membres', `/api/personnes/${id}`),
      api<Adhesion[]>('membres', `/api/adhesions?membre=${id}&itemsPerPage=200`),
      api<Cotisation[]>('membres', `/api/cotisations?membre=${id}&itemsPerPage=200`),
      api<Acces>('membres', `/api/personnes/${id}/acces`),
    ]).then(([p, a, c, x]) => {
      setPersonne(p)
      setAdhesions([...a].sort((u, v) => v.debut.localeCompare(u.debut)))
      setCotisations([...c].sort((u, v) => v.debut.localeCompare(u.debut)))
      setAcces(x)
    }).catch((e) => setErreur(e.message))
  }, [id])
  useEffect(charger, [charger])

  if (erreur) return <p className="erreur" role="alert">{erreur}</p>
  if (!personne) return <p className="aide">Chargement…</p>

  const organisation = (iri: string | null) => ref?.organisations.find((o) => o.id === idDe(iri))
  const categorie = (iri: string) => ref?.categories.find((c) => c.code === idDe(iri))
  const adhesionDe = (iri: string) => adhesions.find((a) => a.id === idDe(iri))
  const enCours = (a: Adhesion) => a.debut.slice(0, 10) <= aujourdhui && (!a.fin || a.fin.slice(0, 10) >= aujourdhui)
  // Coordonnées : selon les droits (l'API omet les champs vides, leur absence ne dit rien).
  const detail = aLeDroit('membres', 'admin', 'gestion')

  return (
    <section className="fiche">
      <div className="fiche-titre">
        <h1>{nomComplet(personne)}</h1>
        <span className={`acces ${acces?.acces ? 'acces-oui' : 'acces-non'}`}>
          {acces?.acces ? 'Accès autorisé aujourd\'hui' : 'Pas d\'accès aujourd\'hui'}
        </span>
      </div>

      <div className="actions">
        <Link className="bouton" to={`/personnes/${id}/modifier`}>Modifier</Link>
        <Link className="bouton bouton-principal" to={`/personnes/${id}/adhesion`}>Nouvelle adhésion</Link>
      </div>

      {detail && (
        <div className="carte">
          <h2>Coordonnées</h2>
          <dl className="definitions">
            <dt>Téléphone</dt><dd>{personne.telephone ? <a href={`tel:${personne.telephone}`}>{telephoneFr(personne.telephone)}</a> : '—'}</dd>
            <dt>E-mail</dt><dd>{personne.email ? <a href={`mailto:${personne.email}`}>{personne.email}</a> : '—'}</dd>
            <dt>Adresse</dt>
            <dd>{personne.adresse
              ? [personne.adresse.ligne1, personne.adresse.ligne2, [personne.adresse.code_postal, personne.adresse.ville].filter(Boolean).join(' '),
                personne.adresse.pays !== 'FR' ? personne.adresse.pays : null].filter(Boolean).join(', ')
              : '—'}</dd>
            <dt>Naissance</dt><dd>{dateFr(personne.dateNaissance) || '—'}</dd>
            {personne.commentaire && <><dt>Commentaire</dt><dd className="commentaire">{personne.commentaire}</dd></>}
          </dl>
        </div>
      )}

      <div className="carte">
        <h2>Adhésions</h2>
        {adhesions.length === 0 && <p className="aide">Aucune adhésion.</p>}
        <ul className="historique">
          {adhesions.map((a) => (
            <li key={a.id} className={enCours(a) ? 'en-cours' : ''}>
              <EtiquetteAssociation organisation={organisation(a.association)} />
              <strong>{categorie(a.categorie)?.libelle ?? idDe(a.categorie)}</strong>
              <span className="periode">{a.fin ? `du ${dateFr(a.debut)} au ${dateFr(a.fin)}` : `depuis le ${dateFr(a.debut)}`}</span>
              {a.auTitreDe && <span className="aide">au titre de {organisation(a.auTitreDe)?.nom}</span>}
              {enCours(a) && aLeDroit('membres', 'admin', 'gestion') && (
                <ActionsAdhesion adhesion={a} categories={ref?.categories ?? []} apres={charger} />
              )}
            </li>
          ))}
        </ul>
      </div>

      <BlocRoles personne={personne.id} organisations={ref?.organisations ?? []} />

      <div className="carte">
        <h2>Cotisations</h2>
        {cotisations.length === 0 && <p className="aide">Aucune cotisation.</p>}
        <table className="tableau">
          <tbody>
            {cotisations.map((c) => (
              <tr key={c.id}>
                <td className="periode-cotisation">{periodeFr(c.debut, c.fin)}</td>
                <td><EtiquetteAssociation organisation={organisation(adhesionDe(c.adhesion)?.association ?? null)} /></td>
                <td className="nombre">{c.gratuite ? <span title={c.motifGratuite ?? ''}>gratuite</span> : `${c.montant.replace('.', ',')} €`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {aLeDroit('comptes', 'admin') && <BlocCompte personne={personne} />}
    </section>
  )
}
