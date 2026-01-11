package discovery

import (
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
