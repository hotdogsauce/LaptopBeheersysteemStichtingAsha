import { createContext, useContext, useCallback, ReactNode } from 'react'

interface TourContextType {
  startTour: (role: string) => void
}

const TourContext = createContext<TourContextType>({ startTour: () => {} })

function buildSteps(role: string) {
  const accountStep = {
    element: '#tour-nav-account',
    popover: {
      title: 'Mijn account',
      description: 'Pas hier je naam, wachtwoord en profielfoto aan. Je kunt ook de rondleiding opnieuw starten via de handleiding.',
    },
  }

  if (role === 'OWNER') {
    return [
      {
        element: '#tour-nav-overzicht',
        popover: {
          title: 'Overzicht',
          description: 'Hier vind je alle laptops en hun huidige status. Als eigenaar kun je laptops inzien en reserveringen aanvragen.',
        },
      },
      {
        element: '#tour-nav-aanvragen',
        popover: {
          title: 'Aanvragen',
          description: 'Dien hier een reserveringsaanvraag in voor je activiteit. Geef de datum, het aantal laptops en het doel op.',
        },
      },
      accountStep,
    ]
  }

  if (role === 'ADMIN') {
    return [
      {
        element: '#tour-nav-overzicht',
        popover: {
          title: 'Overzicht',
          description: 'Bekijk en beheer alle laptops. Als beheerder kun je statussen direct wijzigen en laptops toevoegen.',
        },
      },
      {
        element: '#tour-nav-reserveringen',
        popover: {
          title: 'Reserveringen',
          description: 'Beheer alle inkomende reserveringsaanvragen. Keur ze goed of wijs ze af met een reden.',
        },
      },
      {
        element: '#tour-nav-beheer',
        popover: {
          title: 'Beheer',
          description: 'Voeg laptops toe, neem ze uit beheer en beheer gebruikersaccounts. Het auditlog houdt alle acties bij.',
        },
      },
      {
        element: '#tour-nav-activiteiten',
        popover: {
          title: 'Activiteiten',
          description: 'Maak activiteiten aan zodat eigenaren reserveringen kunnen indienen voor die specifieke activiteit.',
        },
      },
      accountStep,
    ]
  }

  // HELPDESK
  return [
    {
      element: '#tour-nav-overzicht',
      popover: {
        title: 'Overzicht',
        description: 'Bekijk alle laptops. Als helpdesk kun je statussen bijwerken en laptopinformatie bijhouden.',
      },
    },
    {
      element: '#tour-nav-dashboard',
      popover: {
        title: 'Dashboard',
        description: 'Statistieken en bezettingsgraad van het laptoppark in één oogopslag.',
      },
    },
    {
      element: '#tour-nav-storingen',
      popover: {
        title: 'Storingen',
        description: 'Bekijk en verwerk alle gemelde storingen. Wijs ze toe aan een laptop en markeer ze als opgelost.',
      },
    },
    accountStep,
  ]
}

export function TourProvider({ children }: { children: ReactNode }) {
  const startTour = useCallback((role: string) => {
    // Dynamic import so driver.js is only bundled when the tour actually starts
    import('driver.js').then(({ driver }) => {
      const driverObj = driver({
        showProgress: true,
        animate: true,
        overlayOpacity: 0.32,
        smoothScroll: true,
        steps: buildSteps(role),
        nextBtnText: 'Volgende →',
        prevBtnText: '← Terug',
        doneBtnText: 'Klaar ✓',
        onDestroyStarted: () => { driverObj.destroy() },
      })
      driverObj.drive()
    })
  }, [])

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
    </TourContext.Provider>
  )
}

export const useTour = () => useContext(TourContext)
