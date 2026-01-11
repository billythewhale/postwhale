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
	OperationID string
	Method      string
	Path        string
	Summary     string
	Tags        []string
	Parameters  []Parameter
	RequestBody *RequestBody
	Responses   map[string]Response
}

// Parameter represents an endpoint parameter
type Parameter struct {
	Name     string
	In       string // path, query, header
	Required bool
	Schema   Schema
}

// RequestBody represents request body schema
type RequestBody struct {
	Required bool
	Content  map[string]MediaType
}

// MediaType represents a media type with schema
type MediaType struct {
	Schema  Schema
	Example interface{}
}

// Response represents an endpoint response
type Response struct {
	Description string
	Content     map[string]MediaType
}

// Schema represents a JSON schema
type Schema struct {
	Type       string
	Format     string
	Required   []string
	Properties map[string]Schema
	Items      *Schema
	Example    interface{}
	Ref        string
}
