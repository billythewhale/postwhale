package discovery

// TWConfig represents the tw-config.json structure
type TWConfig struct {
	Env struct {
		Port      int    `json:"PORT"`
		ServiceID string `json:"SERVICE_ID"`
	} `json:"env"`
	ServiceID   string                `json:"serviceId"`
	GitRepo     string                `json:"gitRepo"`
	Deployments map[string]Deployment `json:"deployments"`
	Color       string                `json:"color,omitempty"`
	Runtime     string                `json:"runtime,omitempty"`
}

// Deployment represents deployment configuration
type Deployment struct {
	Name      string              `json:"name"`
	Endpoints map[string]Endpoint `json:"endpoints"`
}

// Endpoint represents endpoint configuration
type Endpoint struct {
	Type    string `json:"type"`
	URL     string `json:"url"`
	Cluster string `json:"cluster,omitempty"`
}

// Service represents a discovered service
type Service struct {
	ID        string
	Name      string
	Path      string
	Port      int
	Config    *TWConfig
	Endpoints []APIEndpoint
}

// APIEndpoint represents an OpenAPI endpoint
type APIEndpoint struct {
	OperationID string              `json:"operationId"`
	Method      string              `json:"method"`
	Path        string              `json:"path"`
	Summary     string              `json:"summary"`
	Tags        []string            `json:"tags"`
	Parameters  []Parameter         `json:"parameters"`
	RequestBody *RequestBody        `json:"requestBody,omitempty"`
	Responses   map[string]Response `json:"responses"`
}

// Parameter represents an endpoint parameter
type Parameter struct {
	Name     string `json:"name"`
	In       string `json:"in"` // path, query, header
	Required bool   `json:"required"`
	Schema   Schema `json:"schema"`
}

// RequestBody represents request body schema
type RequestBody struct {
	Required bool                 `json:"required"`
	Content  map[string]MediaType `json:"content"`
}

// MediaType represents a media type with schema
type MediaType struct {
	Schema  Schema      `json:"schema"`
	Example interface{} `json:"example,omitempty"`
}

// Response represents an endpoint response
type Response struct {
	Description string               `json:"description"`
	Content     map[string]MediaType `json:"content,omitempty"`
}

// Schema represents a JSON schema
type Schema struct {
	Type       string            `json:"type,omitempty"`
	Format     string            `json:"format,omitempty"`
	Required   []string          `json:"required,omitempty"`
	Properties map[string]Schema `json:"properties,omitempty"`
	Items      *Schema           `json:"items,omitempty"`
	Example    interface{}       `json:"example,omitempty"`
	Ref        string            `json:"$ref,omitempty"`
}
