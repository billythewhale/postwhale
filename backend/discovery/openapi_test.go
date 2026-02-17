package discovery

import (
	"os"
	"path/filepath"
	"testing"
)

// RED: Test parsing openapi.private.yaml
func TestParseOpenAPI(t *testing.T) {
	openapiPath := "../../fake-repo/services/fusion/openapi.private.yaml"

	spec, err := ParseOpenAPI(openapiPath)
	if err != nil {
		t.Fatalf("Failed to parse openapi.private.yaml: %v", err)
	}

	if spec.Info.Title == "" {
		t.Error("Expected title to be populated")
	}

	if len(spec.Paths) == 0 {
		t.Error("Expected paths to be populated")
	}

	// Check /orders endpoint exists
	ordersPath, exists := spec.Paths["/orders"]
	if !exists {
		t.Error("Expected /orders path to exist")
	}

	// Check POST method exists
	if ordersPath.Post == nil {
		t.Error("Expected POST method on /orders")
	}

	// Check operation ID
	if ordersPath.Post.OperationID != "createOrder" {
		t.Errorf("Expected operationId 'createOrder', got '%s'", ordersPath.Post.OperationID)
	}

	// Check tags
	if len(ordersPath.Post.Tags) == 0 {
		t.Error("Expected tags to be populated")
	}
}

// RED: Test extracting endpoints from OpenAPI spec
func TestExtractEndpoints(t *testing.T) {
	openapiPath := "../../fake-repo/services/fusion/openapi.private.yaml"

	spec, err := ParseOpenAPI(openapiPath)
	if err != nil {
		t.Fatalf("Failed to parse openapi.private.yaml: %v", err)
	}

	endpoints := ExtractEndpoints(spec)

	if len(endpoints) == 0 {
		t.Error("Expected endpoints to be extracted")
	}

	// Find createOrder endpoint
	var createOrderEndpoint *APIEndpoint
	for i := range endpoints {
		if endpoints[i].OperationID == "createOrder" {
			createOrderEndpoint = &endpoints[i]
			break
		}
	}

	if createOrderEndpoint == nil {
		t.Fatal("Expected createOrder endpoint to exist")
	}

	if createOrderEndpoint.Method != "POST" {
		t.Errorf("Expected method 'POST', got '%s'", createOrderEndpoint.Method)
	}

	if createOrderEndpoint.Path != "/orders" {
		t.Errorf("Expected path '/orders', got '%s'", createOrderEndpoint.Path)
	}
}

func TestExtractEndpoints_ResolvesRequestBodySchemaRefs(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	openapiPath := filepath.Join(dir, "openapi.yml")
	spec := `openapi: 3.0.0
info:
  title: Poets API
  version: "1.0.0"
paths:
  /poems:
    post:
      operationId: createPoem
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePoemRequest'
      responses:
        '200':
          description: ok
components:
  schemas:
    CreatePoemRequest:
      type: object
      required:
        - title
      properties:
        title:
          type: string
        wordCount:
          type: integer
        published:
          type: boolean
`
	if err := os.WriteFile(openapiPath, []byte(spec), 0o644); err != nil {
		t.Fatalf("failed to write test openapi file: %v", err)
	}

	parsed, err := ParseOpenAPI(openapiPath)
	if err != nil {
		t.Fatalf("failed to parse openapi: %v", err)
	}

	endpoints := ExtractEndpoints(parsed)
	if len(endpoints) != 1 {
		t.Fatalf("expected 1 endpoint, got %d", len(endpoints))
	}

	body := endpoints[0].RequestBody
	if body == nil {
		t.Fatal("expected request body")
	}

	content, ok := body.Content["application/json"]
	if !ok {
		t.Fatal("expected application/json content")
	}

	if content.Schema.Type != "object" {
		t.Fatalf("expected schema type object, got %q", content.Schema.Type)
	}

	if content.Schema.Properties["title"].Type != "string" {
		t.Fatalf("expected title string schema, got %#v", content.Schema.Properties["title"])
	}
	if content.Schema.Properties["wordCount"].Type != "integer" {
		t.Fatalf("expected wordCount integer schema, got %#v", content.Schema.Properties["wordCount"])
	}
	if content.Schema.Properties["published"].Type != "boolean" {
		t.Fatalf("expected published boolean schema, got %#v", content.Schema.Properties["published"])
	}
}
