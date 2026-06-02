import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '~/client/lib/trpc'

export const Route = createFileRoute('/cars/')({
  component: CarsListPage,
})

function CarsListPage() {
  const { t } = useTranslation()
  const trpc = useTRPC()
  const { data: carsList, isLoading } = useQuery(trpc.cars.list.queryOptions())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ color: 'var(--color-text)' }}>{t('cars.title')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('cars.subtitle')}</p>
        </div>
        <Link to="/cars/add" className="btn-primary">{t('cars.addCar')}</Link>
      </div>

      {isLoading ? (
        <div className="card">
          <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>{t('common.loading')}</p>
        </div>
      ) : !carsList?.length ? (
        <div className="card">
          <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            {t('cars.empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {carsList.map(car => (
            <Link
              key={car.id}
              to="/cars/$carId"
              params={{ carId: car.id }}
              className="card block hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {car.make} {car.model}
                  </span>
                  {car.trim && (
                    <span className="ml-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {car.trim}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {car.year && <span>{car.year}</span>}
                  {car.fuel_type && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}>
                      {car.fuel_type}
                    </span>
                  )}
                </div>
              </div>
              {car.notes && (
                <p className="mt-1 text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {car.notes}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
