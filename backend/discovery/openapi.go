package discovery

import (
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

// OpenAPISpec represents a simplified OpenAPI 3.0 spec
type OpenAPISpec struct {
	OpenAPI    string              `yaml:"openapi"`
	Info       Info                `yaml:"info"`
	Servers    []Server            `yaml:"servers"`
	Paths      map[string]PathItem `yaml:"paths"`
	Components Components          `yaml:"components"`
}

// Info represents OpenAPI info section
type Info struct {
	Title       string `yaml:"title"`
	Description string `yaml:"description"`
	Version     string `yaml:"version"`
}

// Server represents OpenAPI server
type Server struct {
	URL         string `yaml:"url"`
	Description string `yaml:"description"`
}

// PathItem represents an OpenAPI path item
type PathItem struct {
	Get    *Operation `yaml:"get"`
	Post   *Operation `yaml:"post"`
	Put    *Operation `yaml:"put"`
	Delete *Operation `yaml:"delete"`
	Patch  *Operation `yaml:"patch"`
}

// Operation represents an OpenAPI operation
type Operation struct {
	OperationID string                `yaml:"operationId"`
	Summary     string                `yaml:"summary"`
	Description string                `yaml:"description"`
	Tags        []string              `yaml:"tags"`
	Parameters  []OAParameter         `yaml:"parameters"`
	RequestBody *OARequestBody        `yaml:"requestBody"`
	Responses   map[string]OAResponse `yaml:"responses"`
}

// OAParameter represents OpenAPI parameter
type OAParameter struct {
	Name     string   `yaml:"name"`
	In       string   `yaml:"in"`
	Required bool     `yaml:"required"`
	Schema   OASchema `yaml:"schema"`
}

// OARequestBody represents OpenAPI request body
type OARequestBody struct {
	Required bool                   `yaml:"required"`
	Content  map[string]OAMediaType `yaml:"content"`
}

// OAMediaType represents OpenAPI media type
type OAMediaType struct {
	Schema  OASchema    `yaml:"schema"`
	Example interface{} `yaml:"example"`
}

// OAResponse represents OpenAPI response
type OAResponse struct {
	Description string                 `yaml:"description"`
	Content     map[string]OAMediaType `yaml:"content"`
}

// OASchema represents OpenAPI schema (simplified)
type OASchema struct {
	Type       string              `yaml:"type"`
	Format     string              `yaml:"format"`
	Required   []string            `yaml:"required"`
	Properties map[string]OASchema `yaml:"properties"`
	Items      *OASchema           `yaml:"items"`
	Example    interface{}         `yaml:"example"`
	Ref        string              `yaml:"$ref"`
}

// Components represents OpenAPI components section
type Components struct {
	Schemas map[string]OASchema `yaml:"schemas"`
}

// ParseOpenAPI parses an OpenAPI YAML file
func ParseOpenAPI(path string) (*OpenAPISpec, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var spec OpenAPISpec
	if err := yaml.Unmarshal(data, &spec); err != nil {
		return nil, err
	}

	return &spec, nil
}

// ExtractEndpoints extracts endpoint information from OpenAPI spec
func ExtractEndpoints(spec *OpenAPISpec) []APIEndpoint {
	var endpoints []APIEndpoint

	for path, pathItem := range spec.Paths {
		// Handle different HTTP methods
		methods := map[string]*Operation{
			"GET":    pathItem.Get,
			"POST":   pathItem.Post,
			"PUT":    pathItem.Put,
			"DELETE": pathItem.Delete,
			"PATCH":  pathItem.Patch,
		}

		for method, operation := range methods {
			if operation == nil {
				continue
			}

			endpoint := APIEndpoint{
				OperationID: operation.OperationID,
				Method:      method,
				Path:        path,
				Summary:     operation.Summary,
				Tags:        operation.Tags,
			}

			// Convert parameters
			for _, param := range operation.Parameters {
				endpoint.Parameters = append(endpoint.Parameters, Parameter{
					Name:     param.Name,
					In:       param.In,
					Required: param.Required,
					Schema:   convertSchema(param.Schema, spec.Components, map[string]bool{}),
				})
			}

			// Convert request body
			if operation.RequestBody != nil {
				endpoint.RequestBody = &RequestBody{
					Required: operation.RequestBody.Required,
					Content:  make(map[string]MediaType),
				}
				for contentType, mediaType := range operation.RequestBody.Content {
					endpoint.RequestBody.Content[contentType] = MediaType{
						Schema:  convertSchema(mediaType.Schema, spec.Components, map[string]bool{}),
						Example: mediaType.Example,
					}
				}
			}

			// Convert responses
			endpoint.Responses = make(map[string]Response)
			for statusCode, response := range operation.Responses {
				convertedContent := make(map[string]MediaType)
				for contentType, mediaType := range response.Content {
					convertedContent[contentType] = MediaType{
						Schema:  convertSchema(mediaType.Schema, spec.Components, map[string]bool{}),
						Example: mediaType.Example,
					}
				}
				endpoint.Responses[statusCode] = Response{
					Description: response.Description,
					Content:     convertedContent,
				}
			}

			endpoints = append(endpoints, endpoint)
		}
	}

	return endpoints
}

func resolveSchemaRef(ref string, components Components) (*OASchema, bool) {
	const prefix = "#/components/schemas/"
	if !strings.HasPrefix(ref, prefix) {
		return nil, false
	}

	name := strings.TrimPrefix(ref, prefix)
	schema, ok := components.Schemas[name]
	if !ok {
		return nil, false
	}

	return &schema, true
}

// convertSchema converts OASchema to Schema
func convertSchema(oas OASchema, components Components, resolving map[string]bool) Schema {
	if oas.Ref != "" {
		if resolving[oas.Ref] {
			return Schema{Type: "object", Ref: oas.Ref}
		}

		if resolved, ok := resolveSchemaRef(oas.Ref, components); ok {
			resolving[oas.Ref] = true
			converted := convertSchema(*resolved, components, resolving)
			delete(resolving, oas.Ref)

			if converted.Ref == "" {
				converted.Ref = oas.Ref
			}
			return converted
		}
	}

	schema := Schema{
		Type:     oas.Type,
		Format:   oas.Format,
		Required: oas.Required,
		Example:  oas.Example,
		Ref:      oas.Ref,
	}

	if oas.Properties != nil {
		schema.Properties = make(map[string]Schema)
		for key, prop := range oas.Properties {
			schema.Properties[key] = convertSchema(prop, components, resolving)
		}
	}

	if oas.Items != nil {
		items := convertSchema(*oas.Items, components, resolving)
		schema.Items = &items
	}

	return schema
}
