import { useState } from "react"
import { Plus, ChevronRight, ChevronDown, RefreshCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Repository, Service, Endpoint } from "@/types"

interface SidebarProps {
  repositories: Repository[]
  services: Service[]
  endpoints: Endpoint[]
  selectedEndpoint: Endpoint | null
  onSelectEndpoint: (endpoint: Endpoint) => void
  onAddRepository: () => void
  onAutoAddRepos: () => void
  onRefreshAll: () => void
  onRemoveRepository: (id: number) => void
}

export function Sidebar({
  repositories,
  services,
  endpoints,
  selectedEndpoint,
  onSelectEndpoint,
  onAddRepository,
  onAutoAddRepos,
  onRefreshAll,
  onRemoveRepository,
}: SidebarProps) {
  const [expandedRepos, setExpandedRepos] = useState<Set<number>>(new Set())
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set())

  const toggleRepo = (repoId: number) => {
    const newExpanded = new Set(expandedRepos)
    if (newExpanded.has(repoId)) {
      newExpanded.delete(repoId)
    } else {
      newExpanded.add(repoId)
    }
    setExpandedRepos(newExpanded)
  }

  const toggleService = (serviceId: number) => {
    const newExpanded = new Set(expandedServices)
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId)
    } else {
      newExpanded.add(serviceId)
    }
    setExpandedServices(newExpanded)
  }

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-emerald-500",
      POST: "bg-blue-500",
      PUT: "bg-orange-500",
      PATCH: "bg-yellow-500",
      DELETE: "bg-red-500",
    }
    return colors[method] || "bg-gray-500"
  }

  return (
    <div className="w-80 border-r bg-card flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        {repositories.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No repositories added yet
          </div>
        ) : (
          <div className="space-y-1">
            {repositories.map((repo) => {
              const repoServices = services.filter((s) => s.repoId === repo.id)
              const isExpanded = expandedRepos.has(repo.id)

              return (
                <div key={repo.id}>
                  <div className="flex items-center gap-1 w-full">
                    <button
                      onClick={() => toggleRepo(repo.id)}
                      className="flex items-center gap-2 flex-1 px-2 py-1.5 rounded hover:bg-accent/80 dark:hover:bg-white/15 hover:brightness-105 hover:shadow-sm dark:hover:shadow-glow-sm text-sm font-medium cursor-pointer transition-all duration-200 hover:translate-x-0.5 active:translate-x-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="flex-1 text-left">{repo.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {repoServices.length}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveRepository(repo.id)
                      }}
                      className="p-1.5 rounded hover:bg-destructive/20 hover:brightness-110 hover:text-destructive hover:scale-110 transition-all duration-200 cursor-pointer active:scale-100"
                      title="Remove repository"
                      aria-label={`Remove ${repo.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {repoServices.map((service) => {
                        const serviceEndpoints = endpoints.filter(
                          (e) => e.serviceId === service.id
                        )
                        const isServiceExpanded = expandedServices.has(service.id)

                        return (
                          <div key={service.id}>
                            <button
                              onClick={() => toggleService(service.id)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-accent/80 dark:hover:bg-white/15 hover:brightness-105 hover:shadow-sm dark:hover:shadow-glow-sm text-sm cursor-pointer transition-all duration-200 hover:translate-x-0.5 active:translate-x-0"
                            >
                              {isServiceExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="flex-1 text-left">{service.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {serviceEndpoints.length}
                              </span>
                            </button>

                            {isServiceExpanded && (
                              <div className="ml-4 mt-1 space-y-0.5">
                                {serviceEndpoints.map((endpoint) => {
                                  const isSelected = selectedEndpoint?.id === endpoint.id

                                  return (
                                    <button
                                      key={endpoint.id}
                                      onClick={() => onSelectEndpoint(endpoint)}
                                      className={cn(
                                        "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm cursor-pointer transition-all duration-200",
                                        isSelected
                                          ? "bg-primary text-primary-foreground shadow-md dark:shadow-glow-md font-medium scale-[1.02]"
                                          : "hover:bg-accent/90 dark:hover:bg-white/20 hover:brightness-105 hover:shadow-md dark:hover:shadow-glow-md hover:translate-x-1 hover:scale-[1.02] active:translate-x-0 active:scale-100"
                                      )}
                                    >
                                      <Badge
                                        className={cn(
                                          "text-[10px] px-1.5 py-0 text-white",
                                          getMethodColor(endpoint.method)
                                        )}
                                      >
                                        {endpoint.method}
                                      </Badge>
                                      <span className="flex-1 text-left truncate">
                                        {endpoint.path}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t p-4 space-y-2">
        {repositories.length > 0 && (
          <Button
            onClick={onRefreshAll}
            className="w-full"
            size="sm"
            variant="outline"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        )}
        <Button
          onClick={onAutoAddRepos}
          className="w-full"
          size="sm"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Auto Add TW Repos
        </Button>
        <Button
          onClick={onAddRepository}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Repository
        </Button>
      </div>
    </div>
  )
}
