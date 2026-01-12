import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Endpoint, Environment } from "@/types"

interface RequestBuilderProps {
  endpoint: Endpoint | null
  environment: Environment
  onSend: (config: {
    method: string
    path: string
    headers: Record<string, string>
    body: string
  }) => void
  isLoading: boolean
}

export function RequestBuilder({
  endpoint,
  environment: _environment,
  onSend,
  isLoading,
}: RequestBuilderProps) {
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([
    { key: "Content-Type", value: "application/json" },
  ])
  const [body, setBody] = useState("")
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [queryParams, setQueryParams] = useState<Record<string, string>>({})

  if (!endpoint) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">Select an endpoint to get started</p>
          <p className="text-sm mt-2">Choose a service and endpoint from the sidebar</p>
        </div>
      </div>
    )
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

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }])
  }

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    const newHeaders = [...headers]
    newHeaders[index][field] = value
    setHeaders(newHeaders)
  }

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const handleSend = () => {
    const headersObj: Record<string, string> = {}
    headers.forEach((h) => {
      if (h.key && h.value) {
        headersObj[h.key] = h.value
      }
    })

    let finalPath = endpoint.path

    // Replace path parameters
    Object.entries(pathParams).forEach(([key, value]) => {
      finalPath = finalPath.replace(`{${key}}`, value)
    })

    // Add query parameters
    const queryString = Object.entries(queryParams)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&")

    if (queryString) {
      finalPath += `?${queryString}`
    }

    onSend({
      method: endpoint.method,
      path: finalPath,
      headers: headersObj,
      body: body,
    })
  }

  // Extract path parameters
  const pathParamNames = endpoint.path.match(/\{([^}]+)\}/g)?.map((p) => p.slice(1, -1)) || []

  // Extract query parameters from spec (spec may be undefined if not sent from backend)
  const queryParamNames =
    endpoint.spec?.parameters?.filter((p) => p.in === "query").map((p) => p.name) || []

  return (
    <div className="flex-1 flex flex-col">
      <Card className="m-4 mb-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-4">
            <Badge
              className={cn("text-white text-sm px-4 py-1.5", getMethodColor(endpoint.method))}
            >
              {endpoint.method}
            </Badge>
            <span className="font-mono text-xl font-semibold">{endpoint.path}</span>
          </CardTitle>
          {endpoint.spec?.summary && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{endpoint.spec.summary}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="params">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="params">Params</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
              <TabsTrigger value="body">Body</TabsTrigger>
            </TabsList>

            <TabsContent value="params" className="space-y-6 mt-6">
              {pathParamNames.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-foreground">Path Parameters</h4>
                  <div className="space-y-2">
                    {pathParamNames.map((param) => (
                      <div key={param} className="flex items-center gap-2">
                        <span className="text-sm font-mono w-32">{param}</span>
                        <Input
                          placeholder={`Enter ${param}`}
                          value={pathParams[param] || ""}
                          onChange={(e) =>
                            setPathParams({ ...pathParams, [param]: e.target.value })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {queryParamNames.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-foreground">Query Parameters</h4>
                  <div className="space-y-2">
                    {queryParamNames.map((param) => (
                      <div key={param} className="flex items-center gap-2">
                        <span className="text-sm font-mono w-32">{param}</span>
                        <Input
                          placeholder={`Enter ${param}`}
                          value={queryParams[param] || ""}
                          onChange={(e) =>
                            setQueryParams({ ...queryParams, [param]: e.target.value })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pathParamNames.length === 0 && queryParamNames.length === 0 && (
                <p className="text-sm text-muted-foreground">No parameters required</p>
              )}
            </TabsContent>

            <TabsContent value="headers" className="space-y-3 mt-6">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Header key"
                    value={header.key}
                    onChange={(e) => updateHeader(index, "key", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Header value"
                    value={header.value}
                    onChange={(e) => updateHeader(index, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHeader(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addHeader}>
                Add Header
              </Button>
            </TabsContent>

            <TabsContent value="body" className="mt-6">
              <Textarea
                placeholder="Request body (JSON)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono h-64"
              />
            </TabsContent>
          </Tabs>

          <div className="mt-8 pt-6 border-t flex justify-end">
            <Button onClick={handleSend} disabled={isLoading} size="lg">
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
