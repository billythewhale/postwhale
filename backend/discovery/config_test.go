package discovery

import (
	"testing"
)

// RED: Test parsing tw-config.json
func TestParseTWConfig(t *testing.T) {
	configPath := "../../fake-repo/services/fusion/tw-config.json"

	config, err := ParseTWConfig(configPath)
	if err != nil {
		t.Fatalf("Failed to parse tw-config.json: %v", err)
	}

	if config.ServiceID != "fusion" {
		t.Errorf("Expected serviceId 'fusion', got '%s'", config.ServiceID)
	}

	if config.Env.Port != 8080 {
		t.Errorf("Expected PORT 8080, got %d", config.Env.Port)
	}

	if config.Env.ServiceID != "fusion" {
		t.Errorf("Expected SERVICE_ID 'fusion', got '%s'", config.Env.ServiceID)
	}

	// Check deployments exist
	if len(config.Deployments) == 0 {
		t.Error("Expected deployments to be populated")
	}

	// Check fusion deployment exists
	fusionDeployment, exists := config.Deployments["fusion"]
	if !exists {
		t.Error("Expected 'fusion' deployment to exist")
	}

	// Check endpoints exist
	if len(fusionDeployment.Endpoints) == 0 {
		t.Error("Expected endpoints in fusion deployment")
	}

	// Check internal endpoint
	internalEndpoint, exists := fusionDeployment.Endpoints["internal"]
	if !exists {
		t.Error("Expected 'internal' endpoint to exist")
	}

	if internalEndpoint.URL != "http://fusion.srv.whale3.io" {
		t.Errorf("Expected internal URL 'http://fusion.srv.whale3.io', got '%s'", internalEndpoint.URL)
	}
}
