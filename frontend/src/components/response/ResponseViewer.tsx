import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Response } from "@/types"

interface ResponseViewerProps {
  response: Response | null
}

export function ResponseViewer({ response }: ResponseViewerProps) {
  const [copied, setCopied] = useState(false)

  if (!response) {
    return (
      <div className="flex-1 flex items-center justify-center m-4">
        <Card className="w-full">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="text-lg">No response yet</p>
              <p className="text-sm mt-2">Send a request to see the response</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "bg-emerald-500"
    if (statusCode >= 300 && statusCode < 400) return "bg-blue-500"
    if (statusCode >= 400 && statusCode < 500) return "bg-yellow-500"
    if (statusCode >= 500) return "bg-red-500"
    return "bg-gray-500"
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(response.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatJSON = (text: string) => {
    try {
      return JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      return text
    }
  }

  return (
    <div className="flex-1 m-4 mt-0">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Response</span>
              <Badge className={cn("text-white", getStatusColor(response.statusCode))}>
                {response.statusCode} {response.status}
              </Badge>
              <span className="text-sm font-normal text-muted-foreground">
                {response.responseTime}ms
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {response.error ? (
            <div className="p-4 rounded bg-destructive/10 text-destructive">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{response.error}</p>
            </div>
          ) : (
            <Tabs defaultValue="body">
              <TabsList>
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
              </TabsList>

              <TabsContent value="body">
                <pre className="p-4 rounded bg-muted overflow-auto max-h-96 text-sm font-mono">
                  {formatJSON(response.body)}
                </pre>
              </TabsContent>

              <TabsContent value="headers">
                <div className="space-y-2">
                  {Object.entries(response.headers).map(([key, values]) => (
                    <div key={key} className="flex gap-4 text-sm">
                      <span className="font-mono font-medium w-48">{key}</span>
                      <span className="font-mono text-muted-foreground">
                        {Array.isArray(values) ? values.join(", ") : values}
                      </span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
