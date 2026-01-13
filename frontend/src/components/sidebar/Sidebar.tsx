import { useState } from "react"
import { IconPlus, IconChevronRight, IconChevronDown, IconRefresh, IconTrash } from "@tabler/icons-react"
import { Box, Button, Badge, Stack, Group, Text, ActionIcon, ScrollArea } from "@mantine/core"
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

  const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
      GET: "teal",
      POST: "blue",
      PUT: "orange",
      PATCH: "yellow",
      DELETE: "red",
    }
    return colors[method] || "gray"
  }

  return (
    <Box
      style={(theme) => ({
        width: 320,
        borderRight: `1px solid ${theme.colors.dark[5]}`,
        backgroundColor: theme.colors.dark[6],
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      })}
    >
      <ScrollArea flex={1} p="md">
        {repositories.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            No repositories added yet
          </Text>
        ) : (
          <Stack gap={4}>
            {repositories.map((repo) => {
              const repoServices = services.filter((s) => s.repoId === repo.id)
              const isExpanded = expandedRepos.has(repo.id)

              return (
                <Box key={repo.id}>
                  <Group gap={4} wrap="nowrap">
                    <Box
                      onClick={() => toggleRepo(repo.id)}
                      style={(theme) => ({
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: theme.radius.md,
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        },
                      })}
                    >
                      {isExpanded ? (
                        <IconChevronDown size={16} />
                      ) : (
                        <IconChevronRight size={16} />
                      )}
                      <Text size="sm" fw={500} style={{ flex: 1 }}>
                        {repo.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {repoServices.length}
                      </Text>
                    </Box>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveRepository(repo.id)
                      }}
                      title="Remove repository"
                      aria-label={`Remove ${repo.name}`}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>

                  {isExpanded && (
                    <Box ml={16} mt={4}>
                      <Stack gap={4}>
                        {repoServices.map((service) => {
                          const serviceEndpoints = endpoints.filter(
                            (e) => e.serviceId === service.id
                          )
                          const isServiceExpanded = expandedServices.has(service.id)

                          return (
                            <Box key={service.id}>
                              <Box
                                onClick={() => toggleService(service.id)}
                                style={(theme) => ({
                                  padding: '6px 8px',
                                  borderRadius: theme.radius.md,
                                  cursor: 'pointer',
                                  transition: 'all 150ms ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                  },
                                })}
                              >
                                {isServiceExpanded ? (
                                  <IconChevronDown size={16} />
                                ) : (
                                  <IconChevronRight size={16} />
                                )}
                                <Text size="sm" style={{ flex: 1 }}>
                                  {service.name}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {serviceEndpoints.length}
                                </Text>
                              </Box>

                              {isServiceExpanded && (
                                <Box ml={16} mt={2}>
                                  <Stack gap={2}>
                                    {serviceEndpoints.map((endpoint) => {
                                      const isSelected = selectedEndpoint?.id === endpoint.id

                                      return (
                                        <Box
                                          key={endpoint.id}
                                          onClick={() => onSelectEndpoint(endpoint)}
                                          style={(theme) => ({
                                            padding: '6px 8px',
                                            borderRadius: theme.radius.md,
                                            cursor: 'pointer',
                                            transition: 'all 150ms ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            backgroundColor: isSelected
                                              ? theme.colors.blue[6]
                                              : 'transparent',
                                            fontWeight: isSelected ? 500 : 400,
                                            '&:hover': {
                                              backgroundColor: isSelected
                                                ? theme.colors.blue[6]
                                                : 'rgba(255, 255, 255, 0.1)',
                                            },
                                          })}
                                        >
                                          <Badge
                                            color={getMethodColor(endpoint.method)}
                                            size="xs"
                                            variant="filled"
                                          >
                                            {endpoint.method}
                                          </Badge>
                                          <Text
                                            size="sm"
                                            style={{
                                              flex: 1,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                            }}
                                          >
                                            {endpoint.path}
                                          </Text>
                                        </Box>
                                      )
                                    })}
                                  </Stack>
                                </Box>
                              )}
                            </Box>
                          )
                        })}
                      </Stack>
                    </Box>
                  )}
                </Box>
              )
            })}
          </Stack>
        )}
      </ScrollArea>

      <Box
        p="md"
        style={(theme) => ({
          borderTop: `1px solid ${theme.colors.dark[5]}`,
        })}
      >
        <Stack gap="xs">
          {repositories.length > 0 && (
            <Button
              onClick={onRefreshAll}
              variant="default"
              size="sm"
              leftSection={<IconRefresh size={16} />}
              fullWidth
            >
              Refresh All
            </Button>
          )}
          <Button
            onClick={onAutoAddRepos}
            variant="default"
            size="sm"
            leftSection={<IconPlus size={16} />}
            fullWidth
          >
            Auto Add TW Repos
          </Button>
          <Button
            onClick={onAddRepository}
            variant="filled"
            size="sm"
            leftSection={<IconPlus size={16} />}
            fullWidth
          >
            Add Repository
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
