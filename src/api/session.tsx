import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { renouveler, session, surChangementDeSession, type ContenuJeton } from './client'

interface EtatSession {
  utilisateur: ContenuJeton | null
  pret: boolean  // la tentative de reprise de session (cookie) est terminée
}

const Contexte = createContext<EtatSession>({ utilisateur: null, pret: false })

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatSession>({ utilisateur: session(), pret: false })
  useEffect(() => {
    const desabonner = surChangementDeSession((c) => setEtat({ utilisateur: c, pret: true }))
    // Reprendre la session si le cookie de renouvellement est encore valable.
    renouveler().finally(() => setEtat({ utilisateur: session(), pret: true }))
    return () => { desabonner() }
  }, [])
  return <Contexte.Provider value={etat}>{children}</Contexte.Provider>
}

export const useSession = () => useContext(Contexte)
