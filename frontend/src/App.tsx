import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { RequestBuilder } from '@/components/request/RequestBuilder'
import { ResponseViewer } from '@/components/response/ResponseViewer'
import type { Environment, Repository, Service, Endpoint, Response } from '@/types'

// Mock data for development
const mockRepositories: Repository[] = [
  { id: 1, name: 'fake-repo', path: '/Users/billy/postwhale/fake-repo' }
]

const mockServices: Service[] = [
  { id: 1, repoId: 1, serviceId: 'fusion', name: 'Fusion', port: 8080 },
  { id: 2, repoId: 1, serviceId: 'moby', name: 'Moby', port: 8080 }
]

const mockEndpoints: Endpoint[] = [
  {
    id: 1,
    serviceId: 1,
    method: 'POST',
    path: '/orders',
    operationId: 'createOrder',
    spec: {
      summary: 'Create a new order',
      parameters: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      }
    }
  },
  {
    id: 2,
    serviceId: 2,
    method: 'POST',
    path: '/chat',
    operationId: 'chat',
    spec: {
      summary: 'Send a chat message',
      parameters: [],
    }
  },
  {
    id: 3,
    serviceId: 2,
    method: 'GET',
    path: '/sessions/{sessionId}',
    operationId: 'getSession',
    spec: {
      summary: 'Get session by ID',
      parameters: [
        {
          name: 'sessionId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'includeMessages',
          in: 'query',
          required: false,
          schema: { type: 'boolean' }
        }
      ]
    }
  },
  {
    id: 4,
    serviceId: 1,
    method: 'GET',
    path: '/orders/{orderId}',
    operationId: 'getOrder',
    spec: {
      summary: 'Get order by ID',
      parameters: [
        {
          name: 'orderId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ]
    }
  },
  {
    id: 5,
    serviceId: 1,
    method: 'DELETE',
    path: '/orders/{orderId}',
    operationId: 'deleteOrder',
    spec: {
      summary: 'Delete an order',
      parameters: [
        {
          name: 'orderId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ]
    }
  }
]

function App() {
  const [environment, setEnvironment] = useState<Environment>('LOCAL')
  const [repositories] = useState<Repository[]>(mockRepositories)
  const [services] = useState<Service[]>(mockServices)
  const [endpoints] = useState<Endpoint[]>(mockEndpoints)
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)
  const [response, setResponse] = useState<Response | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAddRepository = () => {
    alert('Add repository dialog will be implemented')
  }

  const handleSend = async (_config: {
    method: string
    path: string
    headers: Record<string, string>
    body: string
  }) => {
    setIsLoading(true)

    // Simulate API call - in production this will use the IPC hook
    // const result = await invoke('executeRequest', config);
    setTimeout(() => {
      const mockResponse: Response = {
        statusCode: 200,
        status: 'OK',
        headers: {
          'content-type': ['application/json'],
          'x-request-id': ['123e4567-e89b-12d3-a456-426614174000']
        },
        body: JSON.stringify({
          success: true,
          message: 'This is a mock response',
          data: { id: '123', created: new Date().toISOString() }
        }),
        responseTime: Math.floor(Math.random() * 500) + 100
      }

      setResponse(mockResponse)
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="h-screen flex flex-col">
      <Header environment={environment} onEnvironmentChange={setEnvironment} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          repositories={repositories}
          services={services}
          endpoints={endpoints}
          selectedEndpoint={selectedEndpoint}
          onSelectEndpoint={setSelectedEndpoint}
          onAddRepository={handleAddRepository}
        />

        <div className="flex-1 flex flex-col overflow-auto">
          <RequestBuilder
            endpoint={selectedEndpoint}
            environment={environment}
            onSend={handleSend}
            isLoading={isLoading}
          />

          <ResponseViewer response={response} />
        </div>
      </div>
    </div>
  )
}

export default App
