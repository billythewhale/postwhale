package ipc

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestHandleRequest_AddRepository_AllowsDuplicateMethodPathAcrossGroups(t *testing.T) {
	t.Parallel()

	repoPath := t.TempDir()
	createIPCServiceFixture(t, repoPath, "homer", 8080, map[string]string{
		"openapi.yml": `openapi: 3.0.0
info:
  title: Homer Public API
  version: "1.0.0"
paths:
  /health:
    get:
      operationId: getHealthPublic
`,
		"openapi.internal.yml": `openapi: 3.0.0
info:
  title: Homer Internal API
  version: "1.0.0"
paths:
  /health:
    get:
      operationId: getHealthInternal
`,
	})

	handler := NewHandler(":memory:")
	defer handler.Close()

	addPayload, _ := json.Marshal(map[string]string{"path": repoPath})
	addResponse := handler.HandleRequest(IPCRequest{Action: "addRepository", Data: addPayload})
	if !addResponse.Success {
		t.Fatalf("expected addRepository success, got error: %s", addResponse.Error)
	}

	allEndpointsResponse := handler.HandleRequest(IPCRequest{Action: "getAllEndpoints", Data: json.RawMessage(`{}`)})
	if !allEndpointsResponse.Success {
		t.Fatalf("expected getAllEndpoints success, got error: %s", allEndpointsResponse.Error)
	}

	endpoints, ok := allEndpointsResponse.Data.([]interface{})
	if !ok {
		t.Fatalf("expected endpoints array, got %T", allEndpointsResponse.Data)
	}
	if len(endpoints) != 2 {
		t.Fatalf("expected 2 endpoints, got %d", len(endpoints))
	}

	groupNames := map[string]bool{}
	for _, raw := range endpoints {
		ep, ok := raw.(map[string]interface{})
		if !ok {
			t.Fatalf("expected endpoint object, got %T", raw)
		}
		name, ok := ep["endpointGroupName"].(string)
		if !ok {
			t.Fatalf("expected endpointGroupName string, got %#v", ep["endpointGroupName"])
		}
		groupNames[name] = true
	}

	if !groupNames["public"] {
		t.Fatal("expected public endpoint group")
	}
	if !groupNames["internal"] {
		t.Fatal("expected internal endpoint group")
	}
}

func createIPCServiceFixture(t *testing.T, repoPath string, serviceID string, port int, openAPI map[string]string) {
	t.Helper()

	servicePath := filepath.Join(repoPath, "services", serviceID)
	if err := os.MkdirAll(servicePath, 0o755); err != nil {
		t.Fatalf("failed to create service directory: %v", err)
	}

	config := map[string]interface{}{
		"env": map[string]interface{}{
			"PORT":       port,
			"SERVICE_ID": serviceID,
		},
		"serviceId":   serviceID,
		"gitRepo":     "git@github.com:triplewhale/" + serviceID,
		"deployments": map[string]interface{}{},
	}
	configData, err := json.Marshal(config)
	if err != nil {
		t.Fatalf("failed to marshal config: %v", err)
	}
	writeIPCFile(t, filepath.Join(servicePath, "tw-config.json"), string(configData))

	for fileName, contents := range openAPI {
		writeIPCFile(t, filepath.Join(servicePath, fileName), contents)
	}
}

func writeIPCFile(t *testing.T, path string, contents string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("failed to create directory for %s: %v", path, err)
	}
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatalf("failed to write %s: %v", path, err)
	}
}
