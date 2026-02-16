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

func TestHandleRequest_RefreshRepository_LoadsNewUnderscoreGroupFile(t *testing.T) {
	t.Parallel()

	repoPath := t.TempDir()
	createIPCServiceFixture(t, repoPath, "moby", 8080, map[string]string{
		"openapi.yml": `openapi: 3.0.0
info:
  title: Moby Public API
  version: "1.0.0"
paths:
  /chat:
    post:
      operationId: chatPost
`,
	})

	handler := NewHandler(":memory:")
	defer handler.Close()

	addPayload, _ := json.Marshal(map[string]string{"path": repoPath})
	addResponse := handler.HandleRequest(IPCRequest{Action: "addRepository", Data: addPayload})
	if !addResponse.Success {
		t.Fatalf("expected addRepository success, got error: %s", addResponse.Error)
	}

	addData, ok := addResponse.Data.(map[string]interface{})
	if !ok {
		t.Fatalf("expected addRepository data map, got %T", addResponse.Data)
	}

	var repoID int64
	switch v := addData["id"].(type) {
	case int64:
		repoID = v
	case float64:
		repoID = int64(v)
	default:
		t.Fatalf("expected repo id as int64/float64, got %T", addData["id"])
	}

	writeIPCFile(t, filepath.Join(repoPath, "services", "moby", "openapi.moby_automations.yml"), `openapi: 3.0.0
info:
  title: Moby Automations API
  version: "1.0.0"
paths:
  /tools/jobs/list-jobs:
    post:
      operationId: listJobs
`)

	refreshPayload, _ := json.Marshal(map[string]int64{"id": repoID})
	refreshResponse := handler.HandleRequest(IPCRequest{Action: "refreshRepository", Data: refreshPayload})
	if !refreshResponse.Success {
		t.Fatalf("expected refreshRepository success, got error: %s", refreshResponse.Error)
	}

	var serviceID int64
	if err := handler.database.QueryRow(
		"SELECT id FROM services WHERE repo_id = ? AND service_id = ?",
		repoID,
		"moby",
	).Scan(&serviceID); err != nil {
		t.Fatalf("failed to get refreshed moby service id: %v", err)
	}

	rows, err := handler.database.Query(
		"SELECT endpoint_group_name, path FROM endpoints WHERE service_id = ? ORDER BY endpoint_group_name, path",
		serviceID,
	)
	if err != nil {
		t.Fatalf("failed to query endpoints for service %d: %v", serviceID, err)
	}
	defer rows.Close()

	groupPathSet := map[string]bool{}
	for rows.Next() {
		var groupName string
		var path string
		if err := rows.Scan(&groupName, &path); err != nil {
			t.Fatalf("failed to scan endpoint row: %v", err)
		}
		groupPathSet[groupName+":"+path] = true
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("failed while reading endpoints rows: %v", err)
	}

	if !groupPathSet["public:/chat"] {
		t.Fatalf("expected refreshed public endpoint /chat, got %v", groupPathSet)
	}
	if !groupPathSet["moby_automations:/tools/jobs/list-jobs"] {
		t.Fatalf("expected refreshed moby_automations endpoint, got %v", groupPathSet)
	}

	var misplacedCount int
	if err := handler.database.QueryRow(
		"SELECT COUNT(*) FROM endpoints WHERE service_id != ? AND path = ?",
		serviceID,
		"/tools/jobs/list-jobs",
	).Scan(&misplacedCount); err != nil {
		t.Fatalf("failed to query misplaced refreshed endpoints: %v", err)
	}
	if misplacedCount != 0 {
		t.Fatalf("expected no misplaced refreshed endpoints, found %d", misplacedCount)
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
