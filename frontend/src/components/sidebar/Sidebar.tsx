import { useState } from "react"
import { Plus, ChevronRight, ChevronDown } from "lucide-react"
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
}

export function Sidebar({
  repositories,
  services,
  endpoints,
  selectedEndpoint,
  onSelectEndpoint,
  onAddRepository,
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
                  <button
                    onClick={() => toggleRepo(repo.id)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-accent text-sm font-medium"
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
                              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-accent text-sm"
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
                                        "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm",
                                        isSelected
                                          ? "bg-primary text-primary-foreground"
                                          : "hover:bg-accent"
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

      <div className="border-t p-4">
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
